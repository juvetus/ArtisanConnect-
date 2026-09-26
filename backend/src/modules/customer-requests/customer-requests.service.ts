import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { CustomerRequest, Listing, Service, Shop, User } from '../../entities/index.js';
import type { ContactPreference } from '../../entities/customer-request.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { StorageService } from '../storage/storage.service.js';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';
import { MomoService } from '../momo/momo.service.js';

/** Une demande est adressée à quelques artisans pertinents, pas à toute la place de marché. */
const MAX_TARGETED_ARTISANS = 5;
const MAX_REQUEST_PHOTOS = 5;
const ALLOWED_PHOTO_MIME = ['image/jpeg', 'image/png', 'image/webp'];

function normalize(value?: string | null): string {
  return (value ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

function looselyMatches(first: string, second: string): boolean {
  if (!first || !second) return false;
  return first === second || first.includes(second) || second.includes(first);
}

/** Score de pertinence : métier (50), ville (30), quartier (10), boutique vérifiée (10). */
export function scoreArtisanForRequest(
  request: Pick<CustomerRequest, 'category' | 'city' | 'neighborhood'>,
  context: { artisan: { location?: string | null }; shops: Pick<Shop, 'city' | 'neighborhood' | 'category' | 'verifiedBadge' | 'identityVerified'>[]; categories: string[] },
): number {
  const wantedCategory = normalize(request.category);
  const wantedCity = normalize(request.city);
  const wantedNeighborhood = normalize(request.neighborhood);

  const artisanCategories = [...context.categories, ...context.shops.map((shop) => shop.category)]
    .filter(Boolean)
    .map((value) => normalize(value));
  const artisanCities = [context.artisan.location, ...context.shops.map((shop) => shop.city)]
    .filter(Boolean)
    .map((value) => normalize(value));
  const artisanNeighborhoods = context.shops.map((shop) => normalize(shop.neighborhood)).filter(Boolean);

  const categoryScore = artisanCategories.some((value) => looselyMatches(value, wantedCategory)) ? 50 : 0;
  // Sans métier correspondant, la demande n'est pas adressée à cet artisan.
  if (!categoryScore) return 0;

  const cityScore = artisanCities.some((value) => looselyMatches(value, wantedCity)) ? 30 : 0;
  const neighborhoodScore = wantedNeighborhood && artisanNeighborhoods.some((value) => looselyMatches(value, wantedNeighborhood)) ? 10 : 0;
  const trustScore = context.shops.some((shop) => shop.identityVerified) ? 10 : context.shops.some((shop) => shop.verifiedBadge) ? 5 : 0;

  return categoryScore + cityScore + neighborhoodScore + trustScore;
}

@Injectable()
export class CustomerRequestsService {
  constructor(
    @InjectRepository(CustomerRequest) private readonly requests: Repository<CustomerRequest>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Listing) private readonly listings: Repository<Listing>,
    @InjectRepository(Service) private readonly services: Repository<Service>,
    @InjectRepository(Shop) private readonly shops: Repository<Shop>,
    private readonly notifications: NotificationsService,
    private readonly storage: StorageService,
    private readonly subscriptions: SubscriptionsService,
    private readonly momo: MomoService,
  ) {}

  async create(clientId: string, data: { category: string; city: string; neighborhood?: string; description: string; budgetMin?: number; budgetMax?: number; requestedDate?: string; contactPreference?: ContactPreference; contactPhone?: string }) {
    if (!data.category?.trim() || !data.city?.trim() || !data.description?.trim() || data.description.trim().length < 20) {
      throw new BadRequestException('La catégorie, la ville et une description de 20 caractères sont requises');
    }
    const contactPreference = data.contactPreference ?? 'platform';
    if (contactPreference !== 'platform' && !data.contactPhone?.trim()) {
      throw new BadRequestException('Indiquez le numéro WhatsApp à utiliser pour vous joindre');
    }
    const request = await this.requests.save(this.requests.create({
      clientId,
      category: data.category.trim(),
      city: data.city.trim(),
      neighborhood: data.neighborhood?.trim() || null,
      description: data.description.trim(),
      budgetMin: data.budgetMin ?? null,
      budgetMax: data.budgetMax ?? null,
      requestedDate: data.requestedDate || null,
      contactPreference,
      contactPhone: contactPreference === 'platform' ? null : data.contactPhone!.trim(),
      fileUrls: [],
      status: 'new',
      contactedArtisanIds: [],
      responses: [],
    }));

    const targets = await this.selectArtisansForRequest(request);
    request.contactedArtisanIds = targets.map((target) => target.id);
    await this.requests.save(request);

    const deadline = request.requestedDate ? ` (souhaité pour le ${new Date(request.requestedDate).toLocaleDateString('fr-FR')})` : '';
    const summary = `${request.category} à ${request.neighborhood ? `${request.neighborhood}, ` : ''}${request.city}${deadline} : ${request.description.slice(0, 140)}${request.description.length > 140 ? '…' : ''}`;
    if (!targets.length) {
      await this.notifications.notifyAdmins({
        title: 'Demande client sans artisan correspondant',
        content: `${summary}\nAucun artisan actif ne correspond au métier demandé. Un suivi manuel est nécessaire.`,
        link: '/admin/customer-requests',
        relatedId: request.id,
      }).catch(() => undefined);
    }
    for (const artisan of targets) {
      await this.notifications.notify({
        recipientId: artisan.id,
        type: 'new_order',
        title: 'Nouvelle demande client pour vous',
        content: summary,
        link: '/artisan/customer-requests',
        relatedId: request.id,
      }).catch(() => undefined);

    }

    return request;
  }

  /**
   * Sélectionne les 5 artisans les plus pertinents (métier, ville, quartier, vérification).
   * Sans correspondance, la demande reste visible dans les opportunités plutôt que d'être
   * envoyée à tout le monde.
   */
  private async selectArtisansForRequest(request: CustomerRequest): Promise<User[]> {
    const artisans = await this.users.find({ where: { role: 'artisan', isActive: true } });
    if (!artisans.length) return [];

    const artisanIds = artisans.map((artisan) => artisan.id);
    const [shops, listings, services, premiumIds] = await Promise.all([
      this.shops.find({ where: { sellerId: In(artisanIds), status: 'active' } }),
      this.listings.find({ where: { sellerId: In(artisanIds), status: 'active' } }),
      this.services.find({ where: { status: 'approved' }, relations: { artisan: true } }),
      this.subscriptions.findPremiumUserIds(artisanIds),
    ]);

    return artisans
      .map((artisan) => ({
        artisan,
        premium: premiumIds.has(artisan.id),
        score: scoreArtisanForRequest(request, {
          artisan,
          shops: shops.filter((shop) => shop.sellerId === artisan.id),
          categories: [
            ...listings.filter((listing) => listing.sellerId === artisan.id).map((listing) => listing.category),
            ...services.filter((service) => service.artisan?.id === artisan.id).map((service) => service.category),
          ],
        }),
      }))
      .filter((candidate) => candidate.score > 0)
      // Premium ne remplace jamais la pertinence métier : il départage à score égal.
      .sort((first, second) => second.score - first.score || Number(second.premium) - Number(first.premium))
      .slice(0, MAX_TARGETED_ARTISANS)
      .map((candidate) => candidate.artisan);
  }

  async findMine(clientId: string) {
    const requests = await this.requests.find({ where: { clientId }, order: { createdAt: 'DESC' } });
    return this.enrichResponses(requests);
  }

  async findUnmatchedForAdmin() {
    const requests = await this.requests.find({
      where: [
        { status: 'new', contactedArtisanIds: '' },
        { status: 'new', contactedArtisanIds: IsNull() },
      ],
      order: { createdAt: 'DESC' },
      take: 200,
    });
    const clients = requests.length
      ? await this.users.find({ where: requests.map((request) => ({ id: request.clientId })) })
      : [];
    const clientsById = new Map(clients.map((client) => [client.id, client]));
    return requests.map((request) => ({
      ...request,
      client: clientsById.get(request.clientId)
        ? { id: clientsById.get(request.clientId)!.id, name: clientsById.get(request.clientId)!.name, email: clientsById.get(request.clientId)!.email }
        : null,
    }));
  }

  async replyAsAdmin(requestId: string, message: string) {
    const reply = message?.trim();
    if (!reply) throw new BadRequestException('La réponse est obligatoire');
    const request = await this.requests.findOne({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Demande introuvable');
    if ((request.contactedArtisanIds ?? []).length > 0) {
      throw new BadRequestException('Un artisan a déjà été ciblé pour cette demande');
    }

    request.adminReply = reply;
    request.adminRepliedAt = new Date();
    await this.requests.save(request);
    await this.notifications.notify({
      recipientId: request.clientId,
      type: 'order_status',
      title: 'Réponse de l’équipe ArtisanConnect',
      content: reply,
      link: '/customer-requests',
      relatedId: request.id,
    }).catch(() => undefined);

    return { success: true, adminReply: request.adminReply, adminRepliedAt: request.adminRepliedAt };
  }

  async findOpenForArtisan(artisanId: string, category?: string, city?: string) {
    const requests = await this.requests.find({
      where: [{ status: 'new' }, { status: 'contacted' }, { status: 'in_progress' }],
      order: { createdAt: 'DESC' },
      take: 100,
    });

    const artisan = await this.users.findOne({ where: { id: artisanId } });
    const [shops, listings, services] = await Promise.all([
      this.shops.find({ where: { sellerId: artisanId, status: 'active' } }),
      this.listings.find({ where: { sellerId: artisanId, status: 'active' } }),
      this.services.find({ where: { artisan: { id: artisanId }, status: 'approved' } }),
    ]);
    const context = {
      artisan: { location: artisan?.location ?? null },
      shops,
      categories: [...listings.map((listing) => listing.category), ...services.map((service) => service.category)],
    };

    const normalizedCategory = normalize(category);
    const normalizedCity = normalize(city);
    const clientIds = [...new Set(requests.map((request) => request.clientId))];
    const clients = clientIds.length ? await this.users.find({ where: { id: In(clientIds) } }) : [];
    const clientsById = new Map(clients.map((client) => [client.id, client]));

    return requests
      .filter((request) => {
        // Une fois l'accord conclu, seuls les artisans ayant répondu voient encore la demande.
        if (request.status === 'in_progress' && !(request.responses ?? []).some((response) => response.artisanId === artisanId)) return false;
        if (normalizedCategory && !normalize(request.category).includes(normalizedCategory)) return false;
        if (normalizedCity && !normalize(request.city).includes(normalizedCity)) return false;
        const alreadyAnswered = (request.responses ?? []).some((response) => response.artisanId === artisanId);
        return alreadyAnswered || scoreArtisanForRequest(request, context) > 0;
      })
      .map(({ responses, ...request }) => {
        const myResponse = (responses ?? []).find((response) => response.artisanId === artisanId) ?? null;
        const awarded = request.status === 'in_progress';
        const client = clientsById.get(request.clientId);
        return {
          ...request,
          client: {
            name: client?.name ?? null,
            contactPreference: request.contactPreference,
            contactPhone: request.contactPreference === 'whatsapp' || request.contactPreference === 'both'
              ? request.contactPhone
              : null,
          },
          // « Adressée » = l'artisan fait partie des destinataires retenus lors de la création.
          targeted: (request.contactedArtisanIds ?? []).includes(artisanId),
          alreadyAnswered: Boolean(myResponse),
          myResponse,
          awarded,
          awardedToMe: awarded && myResponse?.status === 'accepted',
          matchScore: Math.min(100, scoreArtisanForRequest(request, context)),
        };
      })
      .sort(
        (first, second) =>
          Number(first.awarded && !first.awardedToMe) - Number(second.awarded && !second.awardedToMe) ||
          Number(second.targeted) - Number(first.targeted) ||
          (second.matchScore ?? 0) - (first.matchScore ?? 0) ||
          new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
      );
  }

  async statsForArtisan(artisanId: string) {
    const requests = await this.requests.find();
    // Le dénominateur est le nombre de demandes réellement adressées à cet artisan.
    const received = requests.filter((request) => (request.contactedArtisanIds ?? []).includes(artisanId));
    const responded = received.filter((request) => (request.responses ?? []).some((response) => response.artisanId === artisanId));

    const responseTimes = received.flatMap((request) => {
      const requestTime = new Date(request.createdAt).getTime();
      return (request.responses ?? [])
        .filter((response) => response.artisanId === artisanId && response.createdAt)
        .map((response) => {
          const responseTime = new Date(response.createdAt).getTime();
          if (Number.isNaN(requestTime) || Number.isNaN(responseTime) || responseTime < requestTime) return null;
          return (responseTime - requestTime) / 60000;
        })
        .filter((value): value is number => value !== null);
    });

    const averageResponseMinutes = responseTimes.length
      ? Math.round(responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length)
      : 0;

    return {
      requestsReceived: received.length,
      responsesSent: responded.length,
      openRequests: received.filter((request) => request.status === 'new' || request.status === 'contacted').length,
      averageResponseMinutes,
    };
  }

  /** Historique de réponse public, calculé sur les seules demandes adressées à l'artisan. */
  async publicStatsForArtisan(artisanId: string) {
    const requests = (await this.requests.find()).filter((request) =>
      (request.contactedArtisanIds ?? []).includes(artisanId),
    );
    const responses = requests.flatMap((request) =>
      (request.responses ?? [])
        .filter((response) => response.artisanId === artisanId && response.createdAt)
        .map((response) => ({ requestCreatedAt: request.createdAt, createdAt: response.createdAt })),
    );

    const delays = responses
      .map(({ requestCreatedAt, createdAt }) => {
        const requestTime = new Date(requestCreatedAt).getTime();
        const responseTime = new Date(createdAt).getTime();
        if (Number.isNaN(requestTime) || Number.isNaN(responseTime) || responseTime < requestTime) return null;
        return (responseTime - requestTime) / 60000;
      })
      .filter((value): value is number => value !== null);

    const lastResponseAt = responses.length
      ? responses.map((response) => response.createdAt).sort().at(-1)!
      : null;

    return {
      requestsReceived: requests.length,
      responsesSent: responses.length,
      responseRate: requests.length ? Math.round((responses.length / requests.length) * 100) : 0,
      averageResponseMinutes: delays.length ? Math.round(delays.reduce((sum, value) => sum + value, 0) / delays.length) : 0,
      lastResponseAt,
    };
  }

  private async enrichResponses(requests: CustomerRequest[]) {
    const ids = [...new Set(requests.flatMap((request) => (request.responses ?? []).map((response) => response.artisanId)))];
    if (!ids.length) return requests;
    const artisans = await this.users.find({ where: ids.map((id) => ({ id })) });
    const byId = new Map(artisans.map((artisan) => [artisan.id, artisan]));
    return requests.map((request) => ({ ...request, responses: (request.responses ?? []).map((response) => ({ ...response, artisan: byId.get(response.artisanId) ? { id: byId.get(response.artisanId)!.id, name: byId.get(response.artisanId)!.name, phone: byId.get(response.artisanId)!.phone, whatsappPhone: byId.get(response.artisanId)!.whatsappPhone } : null })) }));
  }

  async respond(artisanId: string, id: string, data: { price?: number; days?: number; message: string }) {
    if (!data.message?.trim()) throw new BadRequestException('Un message est requis');
    const request = await this.requests.findOne({ where: { id } });
    if (!request) throw new NotFoundException('Demande introuvable');
    if (request.status !== 'new' && request.status !== 'contacted') throw new BadRequestException('Cette demande n’est plus ouverte');
    const responses = [...(request.responses ?? [])];
    if (responses.some((response) => response.artisanId === artisanId)) throw new BadRequestException('Vous avez déjà répondu à cette demande');
    responses.push({ artisanId, price: data.price, days: data.days, message: data.message.trim(), createdAt: new Date().toISOString() });
    request.responses = responses;
    request.contactedArtisanIds = [...new Set([...(request.contactedArtisanIds ?? []), artisanId])];
    request.status = 'contacted';
    await this.requests.save(request);
    await this.notifications.notify({ recipientId: request.clientId, type: 'order_status', title: 'Un artisan a répondu à votre demande', content: data.message.trim(), link: '/customer-requests', relatedId: request.id });
    return request;
  }

  /** L'artisan ajuste son offre, y compris le prix convenu après discussion avec le client. */
  async updateResponse(artisanId: string, id: string, data: { price?: number; days?: number; message?: string }) {
    const request = await this.requests.findOne({ where: { id } });
    if (!request) throw new NotFoundException('Demande introuvable');
    const current = (request.responses ?? []).find((response) => response.artisanId === artisanId);
    if (!current) throw new NotFoundException('Vous n’avez pas encore répondu à cette demande');
    if (request.status === 'completed') throw new BadRequestException('Cette demande est clôturée');
    if (request.paymentStatus && request.paymentStatus !== 'unpaid') throw new BadRequestException('Le paiement est déjà engagé : le prix ne peut plus être modifié');
    if (request.status === 'in_progress' && current.status !== 'accepted') throw new BadRequestException('Offre déjà pourvue : le client a retenu un autre artisan');
    if (data.price !== undefined && (!Number.isFinite(data.price) || data.price < 0)) throw new BadRequestException('Prix invalide');
    if (data.days !== undefined && (!Number.isFinite(data.days) || data.days < 1)) throw new BadRequestException('Délai invalide');

    const updated = {
      ...current,
      price: data.price ?? current.price,
      days: data.days ?? current.days,
      message: data.message?.trim() || current.message,
      // Une offre refusée puis modifiée redevient une proposition à étudier.
      status: current.status === 'rejected' ? undefined : current.status,
      updatedAt: new Date().toISOString(),
    };
    request.responses = (request.responses ?? []).map((response) => (response.artisanId === artisanId ? updated : response));
    await this.requests.save(request);

    const terms = [updated.price !== undefined ? `${updated.price} FCFA` : 'prix à convenir', updated.days ? `${updated.days} jours` : null].filter(Boolean).join(' · ');
    await this.notifications.notify({
      recipientId: request.clientId,
      type: 'order_status',
      title: 'Un artisan a modifié son offre',
      content: `Nouvelle offre : ${terms}. ${updated.message}`,
      link: '/customer-requests',
      relatedId: request.id,
    });
    return request;
  }

  async decideResponse(clientId: string, requestId: string, artisanId: string, decision: 'accepted' | 'rejected') {
    const request = await this.requests.findOne({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Demande introuvable');
    if (request.clientId !== clientId) throw new ForbiddenException('Cette demande ne vous concerne pas');
    const response = (request.responses ?? []).find((item) => item.artisanId === artisanId);
    if (!response) throw new NotFoundException('Réponse artisan introuvable');
    if (decision === 'accepted' && request.status === 'in_progress' && response.status !== 'accepted') {
      throw new BadRequestException('Vous avez déjà retenu un artisan pour cette demande');
    }
    request.responses = (request.responses ?? []).map((item) => ({
      ...item,
      status: item.artisanId === artisanId ? decision : item.status,
    }));
    if (decision === 'accepted') request.status = 'in_progress';
    await this.requests.save(request);
    await this.notifications.notify({
      recipientId: artisanId,
      type: 'order_status',
      title: decision === 'accepted' ? 'Votre proposition a été acceptée' : 'Votre proposition a été refusée',
      content: decision === 'accepted' ? 'Le client souhaite poursuivre avec vous.' : 'Le client a choisi une autre proposition.',
      link: `/artisan/customer-requests`,
      relatedId: request.id,
    });
    if (decision === 'accepted') {
      const others = (request.responses ?? []).filter((item) => item.artisanId !== artisanId);
      await Promise.all(others.map((item) => this.notifications.notify({
        recipientId: item.artisanId,
        type: 'order_status',
        title: 'Offre déjà pourvue',
        content: `Le client a retenu un autre artisan pour la demande ${request.category} à ${request.city}.`,
        link: '/artisan/customer-requests',
        relatedId: request.id,
      })));
    }
    return request;
  }

  async findOneForUser(userId: string, id: string) {
    const request = await this.requests.findOne({ where: { id } });
    if (!request) throw new NotFoundException('Demande introuvable');
    if (request.clientId !== userId) throw new ForbiddenException('Cette demande ne vous concerne pas');
    return request;
  }

  private async findAwarded(id: string) {
    const request = await this.requests.findOne({ where: { id } });
    if (!request) throw new NotFoundException('Demande introuvable');
    const accepted = (request.responses ?? []).find((response) => response.status === 'accepted');
    if (request.status !== 'in_progress' || !accepted) throw new BadRequestException('Aucun artisan n’a encore été retenu pour cette demande');
    return { request, accepted };
  }

  /** L'artisan retenu signale que le travail est terminé : le client peut alors payer. */
  async markDelivered(artisanId: string, id: string) {
    const { request, accepted } = await this.findAwarded(id);
    if (accepted.artisanId !== artisanId) throw new ForbiddenException('Seul l’artisan retenu peut déclarer la livraison');
    if (!accepted.price || accepted.price <= 0) throw new BadRequestException('Fixez d’abord le prix convenu avant de déclarer la livraison');
    request.deliveredAt = new Date();
    await this.requests.save(request);
    await this.notifications.notify({
      recipientId: request.clientId,
      type: 'order_status',
      title: 'Travail livré : paiement attendu',
      content: `L’artisan a terminé le travail (${request.category}). Montant convenu : ${accepted.price} FCFA.`,
      link: '/customer-requests',
      relatedId: request.id,
    });
    return request;
  }

  async pay(clientId: string, id: string, data: { method: 'momo' | 'cash'; payerPhone?: string }) {
    const { request, accepted } = await this.findAwarded(id);
    if (request.clientId !== clientId) throw new ForbiddenException('Cette demande ne vous concerne pas');
    if (!request.deliveredAt) throw new BadRequestException('L’artisan n’a pas encore déclaré la livraison');
    if (request.paymentStatus === 'paid') throw new BadRequestException('Cette demande est déjà payée');
    if (data.method !== 'momo' && data.method !== 'cash') throw new BadRequestException('Moyen de paiement invalide');
    const amount = Number(accepted.price);
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('Le prix convenu est manquant');

    request.paymentMethod = data.method;
    request.paymentAmount = amount;
    request.paymentStatus = 'pending';
    if (data.method === 'momo') {
      const phone = String(data.payerPhone ?? '').replace(/[\s().-]/g, '');
      if (!/^\+?\d{8,15}$/.test(phone)) throw new BadRequestException('Numéro MoMo invalide');
      const result = await this.momo.initiateCollectionPayment({
        amount,
        currency: 'XAF',
        externalId: `REQ-${request.id}`,
        payerPhone: phone,
        payerMessage: 'Paiement ArtisanConnect',
        payeeNote: `Demande ${request.category}`,
      });
      if (result.status === 'FAILED') throw new BadRequestException(result.message || 'Le paiement MoMo a échoué');
      request.paymentReference = result.referenceId ?? null;
    }
    await this.requests.save(request);
    if (data.method === 'cash') {
      await this.notifications.notify({
        recipientId: accepted.artisanId,
        type: 'payment',
        title: 'Paiement en espèces à confirmer',
        content: `Le client indique vous régler ${amount} FCFA en espèces. Confirmez la réception dans vos opportunités.`,
        link: '/artisan/customer-requests',
        relatedId: request.id,
      });
    }
    return request;
  }

  async confirmMomo(clientId: string, id: string) {
    const { request, accepted } = await this.findAwarded(id);
    if (request.clientId !== clientId) throw new ForbiddenException('Cette demande ne vous concerne pas');
    if (request.paymentMethod !== 'momo' || request.paymentStatus !== 'pending' || !request.paymentReference) throw new BadRequestException('Aucun paiement MoMo en attente');
    const result = await this.momo.getPaymentStatus(request.paymentReference);
    if (result.status === 'SUCCESS') return this.markPaid(request, accepted.artisanId);
    if (result.status === 'FAILED' || result.status === 'EXPIRED') {
      request.paymentStatus = 'unpaid';
      await this.requests.save(request);
      throw new BadRequestException('Le paiement MoMo a échoué ou expiré. Vous pouvez réessayer.');
    }
    return request;
  }

  async confirmCash(artisanId: string, id: string) {
    const { request, accepted } = await this.findAwarded(id);
    if (accepted.artisanId !== artisanId) throw new ForbiddenException('Seul l’artisan retenu peut confirmer l’encaissement');
    if (request.paymentMethod !== 'cash' || request.paymentStatus !== 'pending') throw new BadRequestException('Aucun paiement en espèces en attente');
    return this.markPaid(request, artisanId);
  }

  private async markPaid(request: CustomerRequest, artisanId: string) {
    request.paymentStatus = 'paid';
    request.paidAt = new Date();
    request.status = 'completed';
    await this.requests.save(request);
    const content = `Paiement de ${request.paymentAmount} FCFA confirmé pour la demande ${request.category} à ${request.city}.`;
    await Promise.all([
      this.notifications.notify({ recipientId: artisanId, type: 'payment', title: 'Paiement reçu', content, link: '/artisan/customer-requests', relatedId: request.id }),
      this.notifications.notify({ recipientId: request.clientId, type: 'payment', title: 'Paiement confirmé', content, link: '/customer-requests', relatedId: request.id }),
    ]);
    return request;
  }

  /** Le client clôture sa demande une fois le travail réalisé ou abandonné. */
  async complete(clientId: string, id: string) {
    const request = await this.requests.findOne({ where: { id } });
    if (!request) throw new NotFoundException('Demande introuvable');
    if (request.clientId !== clientId) throw new ForbiddenException('Cette demande ne vous concerne pas');
    request.status = 'completed';
    return this.requests.save(request);
  }

  async addPhotos(clientId: string, id: string, files: Express.Multer.File[]) {
    const request = await this.requests.findOne({ where: { id } });
    if (!request) throw new NotFoundException('Demande introuvable');
    if (request.clientId !== clientId) throw new ForbiddenException('Cette demande ne vous concerne pas');
    if (!files?.length) throw new BadRequestException('Aucune photo reçue');

    const existing = request.fileUrls ?? [];
    if (existing.length + files.length > MAX_REQUEST_PHOTOS) {
      throw new BadRequestException(`Vous pouvez joindre au maximum ${MAX_REQUEST_PHOTOS} photos`);
    }
    if (files.some((file) => !ALLOWED_PHOTO_MIME.includes(file.mimetype))) {
      throw new BadRequestException('Formats acceptés : JPEG, PNG, WebP');
    }
    if (!this.storage.isEnabled()) {
      throw new BadRequestException('Le stockage des photos n’est pas configuré.');
    }

    const uploads = await Promise.all(
      files.map((file) => this.storage.uploadBuffer(file.buffer, 'artisanconnect/customer-requests', 'image')),
    );
    request.fileUrls = [...existing, ...uploads.map((upload) => upload.url)];
    return this.requests.save(request);
  }
}

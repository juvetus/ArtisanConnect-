import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CustomerRequest, Listing, Service, Shop, User } from '../../entities/index.js';
import type { ContactPreference } from '../../entities/customer-request.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { EmailService } from '../email/email.service.js';
import { StorageService } from '../storage/storage.service.js';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';

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
    private readonly emails: EmailService,
    private readonly storage: StorageService,
    private readonly subscriptions: SubscriptionsService,
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
    for (const artisan of targets) {
      await this.notifications.notify({
        recipientId: artisan.id,
        type: 'new_order',
        title: 'Nouvelle demande client pour vous',
        content: summary,
        link: '/artisan/customer-requests',
        relatedId: request.id,
      });

      if (artisan.email) {
        await this.emails.send({
          to: artisan.email,
          subject: `[ArtisanConnect] Demande ${request.category} à ${request.city}`,
          text: `Bonjour ${artisan.name ?? ''},\n\nUn client recherche un artisan : ${summary}\n\nRépondez avec votre prix et votre délai depuis votre espace : /artisan/customer-requests\n\nArtisanConnect`,
          html: `<p>Bonjour ${artisan.name ?? ''},</p><p>Un client recherche un artisan :</p><blockquote>${summary}</blockquote><p><a href="/artisan/customer-requests">Répondre avec votre prix et votre délai</a></p><p>ArtisanConnect</p>`,
        }).catch(() => undefined);
      }
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

  async findOpenForArtisan(artisanId: string, category?: string, city?: string) {
    const requests = await this.requests.find({
      where: [{ status: 'new' }, { status: 'contacted' }],
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

    return requests
      .filter((request) => {
        if (normalizedCategory && !normalize(request.category).includes(normalizedCategory)) return false;
        if (normalizedCity && !normalize(request.city).includes(normalizedCity)) return false;
        return true;
      })
      .map((request) => ({
        ...request,
        // « Adressée » = l'artisan fait partie des destinataires retenus lors de la création.
        targeted: (request.contactedArtisanIds ?? []).includes(artisanId),
        alreadyAnswered: (request.responses ?? []).some((response) => response.artisanId === artisanId),
        matchScore: Math.min(100, scoreArtisanForRequest(request, context)),
      }))
      .sort(
        (first, second) =>
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

  async decideResponse(clientId: string, requestId: string, artisanId: string, decision: 'accepted' | 'rejected') {
    const request = await this.requests.findOne({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Demande introuvable');
    if (request.clientId !== clientId) throw new ForbiddenException('Cette demande ne vous concerne pas');
    const response = (request.responses ?? []).find((item) => item.artisanId === artisanId);
    if (!response) throw new NotFoundException('Réponse artisan introuvable');
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
    return request;
  }

  async findOneForUser(userId: string, id: string) {
    const request = await this.requests.findOne({ where: { id } });
    if (!request) throw new NotFoundException('Demande introuvable');
    if (request.clientId !== userId) throw new ForbiddenException('Cette demande ne vous concerne pas');
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

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerRequest, Listing, Service, Shop, User } from '../../entities/index.js';
import { NotificationsService } from '../notifications/notifications.service.js';

@Injectable()
export class CustomerRequestsService {
  constructor(
    @InjectRepository(CustomerRequest) private readonly requests: Repository<CustomerRequest>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Listing) private readonly listings: Repository<Listing>,
    @InjectRepository(Service) private readonly services: Repository<Service>,
    @InjectRepository(Shop) private readonly shops: Repository<Shop>,
    private readonly notifications: NotificationsService,
  ) {}

  async create(clientId: string, data: { category: string; city: string; neighborhood?: string; description: string; budgetMin?: number; budgetMax?: number; requestedDate?: string }) {
    if (!data.category?.trim() || !data.city?.trim() || !data.description?.trim() || data.description.trim().length < 20) {
      throw new BadRequestException('La catégorie, la ville et une description de 20 caractères sont requises');
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
      status: 'open',
      contactedArtisanIds: [],
      responses: [],
    }));

    const artisans = await this.users.find({ where: { role: 'artisan', isActive: true } }) ?? [];
    await Promise.all(artisans.map((artisan) => this.notifications.notify({
      recipientId: artisan.id,
      type: 'new_order',
      title: 'Nouvelle demande client',
      content: `${request.category} à ${request.city} : ${request.description.slice(0, 140)}${request.description.length > 140 ? '…' : ''}`,
      link: '/artisan/customer-requests',
      relatedId: request.id,
    })));

    return request;
  }

  async findMine(clientId: string) {
    const requests = await this.requests.find({ where: { clientId }, order: { createdAt: 'DESC' } });
    return this.enrichResponses(requests);
  }

  async findOpenForArtisan(artisanId: string, category?: string, city?: string) {
    const requests = await this.requests.find({ where: { status: 'open' }, order: { createdAt: 'DESC' }, take: 100 });
    // Sans filtre explicite, le pilote montre toutes les opportunités afin qu'une
    // demande ne soit pas masquée par un profil vendeur encore incomplet.
    if (!category?.trim() && !city?.trim()) return requests;
    const artisan = await this.users.findOne({ where: { id: artisanId } });
    const [shops, listings, services] = await Promise.all([
      this.shops.find({ where: { sellerId: artisanId, status: 'active' } }),
      this.listings.find({ where: { sellerId: artisanId, status: 'active' } }),
      this.services.find({ where: { artisan: { id: artisanId }, status: 'approved' } }),
    ]);
    const categories = [...listings.map((listing) => listing.category), ...services.map((service) => service.category)].filter(Boolean).map((value) => value.toLowerCase());
    const cities = [...(artisan?.location ? [artisan.location] : []), ...shops.flatMap((shop) => [shop.city, shop.neighborhood])].filter(Boolean).map((value) => value!.toLowerCase());
    const normalizedCategory = category?.trim().toLowerCase();
    const normalizedCity = city?.trim().toLowerCase();
    const matchingRequests = requests.filter((request) => {
      const categoryMatches = normalizedCategory ? request.category.toLowerCase().includes(normalizedCategory) : (!categories.length || categories.some((value) => request.category.toLowerCase().includes(value) || value.includes(request.category.toLowerCase())));
      const cityMatches = normalizedCity ? request.city.toLowerCase().includes(normalizedCity) : (!cities.length || cities.some((value) => request.city.toLowerCase().includes(value) || value.includes(request.city.toLowerCase())));
      return categoryMatches && cityMatches;
    });

    return matchingRequests
      .map((request) => {
        const requestCategory = request.category.toLowerCase();
        const requestCity = request.city.toLowerCase();
        const categoryScore = categories.some((value) => value === requestCategory) ? 40 : categories.some((value) => value.includes(requestCategory) || requestCategory.includes(value)) ? 20 : 0;
        const cityScore = cities.some((value) => value === requestCity) ? 40 : cities.some((value) => value.includes(requestCity) || requestCity.includes(value)) ? 20 : 0;
        const verifiedShopScore = shops.some((shop) => shop.verifiedBadge) ? 10 : 0;
        return { ...request, matchScore: Math.min(100, categoryScore + cityScore + verifiedShopScore) };
      })
      .sort((first, second) => (second.matchScore ?? 0) - (first.matchScore ?? 0));
  }

  async statsForArtisan(artisanId: string) {
    const requests = await this.requests.find();
    const received = requests.filter((request) => (request.responses ?? []).some((response) => response.artisanId === artisanId));
    const responded = received.filter((request) => (request.responses ?? []).some((response) => response.artisanId === artisanId));

    const responseTimes = requests.flatMap((request) => {
      const requestTime = new Date(request.createdAt).getTime();
      const artisanResponses = (request.responses ?? []).filter((response) => response.artisanId === artisanId && response.createdAt);
      return artisanResponses
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
      openRequests: requests.filter((request) => request.status === 'open').length,
      averageResponseMinutes,
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
    if (request.status !== 'open') throw new BadRequestException('Cette demande n’est plus ouverte');
    const responses = [...(request.responses ?? [])];
    if (responses.some((response) => response.artisanId === artisanId)) throw new BadRequestException('Vous avez déjà répondu à cette demande');
    responses.push({ artisanId, price: data.price, days: data.days, message: data.message.trim(), createdAt: new Date().toISOString() });
    request.responses = responses;
    request.contactedArtisanIds = [...new Set([...(request.contactedArtisanIds ?? []), artisanId])];
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
    if (decision === 'accepted') request.status = 'assigned';
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
}

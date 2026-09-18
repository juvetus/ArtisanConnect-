import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { AnalyticsEvent, type AnalyticsEventType } from '../../entities/analytics-event.entity.js';
import { CustomerRequest, Order, Shop, User } from '../../entities/index.js';

const EVENT_TYPES: AnalyticsEventType[] = [
  'search',
  'category_view',
  'artisan_profile_view',
  'listing_view',
  'whatsapp_click',
  'quote_form_opened',
];

/** Les champs libres viennent du navigateur : ils sont tronqués avant stockage. */
function clamp(value: string | undefined | null, max: number): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(AnalyticsEvent) private readonly events: Repository<AnalyticsEvent>,
    @InjectRepository(CustomerRequest) private readonly requests: Repository<CustomerRequest>,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Shop) private readonly shops: Repository<Shop>,
  ) {}

  async record(
    data: { type: string; sessionId: string; label?: string; targetId?: string; city?: string },
    userId?: string,
  ): Promise<{ recorded: boolean }> {
    if (!EVENT_TYPES.includes(data.type as AnalyticsEventType)) {
      throw new BadRequestException('Type d’évènement inconnu');
    }
    const sessionId = clamp(data.sessionId, 64);
    if (!sessionId) throw new BadRequestException('Session manquante');

    await this.events.insert({
      type: data.type as AnalyticsEventType,
      sessionId,
      userId: userId ?? null,
      label: clamp(data.label, 120),
      targetId: clamp(data.targetId, 64),
      city: clamp(data.city, 120),
    });

    return { recorded: true };
  }

  /** Tunnel visiteur → recherche → profil → contact → demande → commande. */
  async funnel(days = 30) {
    const since = new Date(Date.now() - Math.min(Math.max(days, 1), 365) * 24 * 60 * 60 * 1000);
    const range = Between(since, new Date());

    const [events, requests, orders, artisans, shops] = await Promise.all([
      this.events.find({ where: { createdAt: range } }),
      this.requests.find(),
      this.orders.find(),
      this.users.find({ where: { role: 'artisan' } }),
      this.shops.find(),
    ]);

    const countByType = (type: AnalyticsEventType) => events.filter((event) => event.type === type).length;
    const visitors = new Set(events.map((event) => event.sessionId)).size;

    const recentRequests = requests.filter((request) => new Date(request.createdAt) >= since);
    const answeredRequests = recentRequests.filter((request) => (request.responses ?? []).length > 0);
    const targetedRequests = recentRequests.filter((request) => (request.contactedArtisanIds ?? []).length > 0);
    const recentOrders = orders.filter((order) => new Date(order.createdAt) >= since);

    const activeArtisanIds = new Set([
      ...shops.filter((shop) => shop.status === 'active').map((shop) => shop.sellerId),
    ]);

    return {
      periodDays: days,
      funnel: {
        visitors,
        searches: countByType('search'),
        categoryViews: countByType('category_view'),
        artisanProfileViews: countByType('artisan_profile_view'),
        listingViews: countByType('listing_view'),
        whatsappClicks: countByType('whatsapp_click'),
        quoteFormsOpened: countByType('quote_form_opened'),
        quoteRequests: recentRequests.length,
        orders: recentOrders.length,
      },
      conversion: {
        visitorToQuote: visitors ? Math.round((recentRequests.length / visitors) * 100) : 0,
        visitorToOrder: visitors ? Math.round((recentOrders.length / visitors) * 100) : 0,
        quoteToAnswer: targetedRequests.length
          ? Math.round((answeredRequests.length / targetedRequests.length) * 100)
          : 0,
        profileViewToWhatsapp: countByType('artisan_profile_view')
          ? Math.round((countByType('whatsapp_click') / countByType('artisan_profile_view')) * 100)
          : 0,
      },
      artisans: {
        registered: artisans.length,
        active: activeArtisanIds.size,
        withIdentityVerified: shops.filter((shop) => shop.identityVerified).length,
      },
      topSearches: topLabels(events.filter((event) => event.type === 'search')),
      topCategories: topLabels(events.filter((event) => event.type === 'category_view')),
      topCities: topLabels(events.filter((event) => event.city), 'city'),
    };
  }
}

function topLabels(events: AnalyticsEvent[], field: 'label' | 'city' = 'label') {
  const counts = new Map<string, number>();
  for (const event of events) {
    const key = event[field];
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((first, second) => second[1] - first[1])
    .slice(0, 10)
    .map(([label, count]) => ({ label, count }));
}

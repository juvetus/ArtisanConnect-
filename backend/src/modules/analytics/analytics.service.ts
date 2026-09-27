import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, MoreThan, Repository } from 'typeorm';
import { AnalyticsEvent, type AnalyticsEventType } from '../../entities/analytics-event.entity.js';
import { CustomerRequest, Listing, Order, Review, Service, ServiceOrder, ServiceReview, Shop, Subscription, User } from '../../entities/index.js';
import { isDemoMode } from '../../demo-mode.js';

const EVENT_TYPES: AnalyticsEventType[] = [
  'search',
  'category_view',
  'artisan_profile_view',
  'listing_view',
  'whatsapp_click',
  'quote_form_opened',
  'order_created',
  'pricing_view',
  'plan_cta_clicked',
  'subscription_created',
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
    @InjectRepository(Listing) private readonly listings: Repository<Listing>,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    @InjectRepository(Service) private readonly services: Repository<Service>,
    @InjectRepository(ServiceOrder) private readonly serviceOrders: Repository<ServiceOrder>,
    @InjectRepository(ServiceReview) private readonly serviceReviews: Repository<ServiceReview>,
    @InjectRepository(Shop) private readonly shops: Repository<Shop>,
    @InjectRepository(Subscription) private readonly subscriptions: Repository<Subscription>,
    @InjectRepository(User) private readonly users: Repository<User>,
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
      isDemo: isDemoMode(),
    });

    return { recorded: true };
  }

  /** Tunnel visiteur → recherche → profil → contact → demande → commande. */
  async funnel(days = 30) {
    const periodDays = Number.isFinite(days) ? Math.min(Math.max(Math.floor(days), 1), 365) : 30;
    const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
    const range = Between(since, new Date());

    const [allEvents, allRequests, allOrders, allServiceOrders, productReviews, serviceReviews, allListings, allServices, shops, users, subscriptions] = await Promise.all([
      this.events.find({ where: { createdAt: range } }),
      this.requests.find({ where: { createdAt: MoreThan(since) } }),
      this.orders.find({ where: { createdAt: MoreThan(since) }, relations: { listing: true } }),
      this.serviceOrders.find({ where: { createdAt: MoreThan(since) } }),
      this.reviews.find({ where: { createdAt: MoreThan(since), verified: true }, relations: { order: { listing: true } } }),
      this.serviceReviews.find({ where: { createdAt: MoreThan(since), verified: true }, relations: { order: true } }),
      this.listings.find({ where: { status: 'active' } }),
      this.services.find({ where: { status: 'approved' }, relations: { artisan: true } }),
      this.shops.find(),
      this.users.find({ where: { role: 'artisan', createdAt: range } }),
      this.subscriptions.find({ where: { createdAt: range }, relations: { plan: true } }),
    ]);

    const events = allEvents.filter((event) => event.isDemo === false);
    const recentRequests = allRequests.filter((request) => request.isDemo === false);
    const recentServiceOrders = allServiceOrders.filter((order) => order.isDemo === false);
    const recentOrders = allOrders.filter((order) => order.listing?.isDemo === false);
    const countByType = (type: AnalyticsEventType) => events.filter((event) => event.type === type).length;
    const sessionsFor = (type: AnalyticsEventType) => new Set(events.filter((event) => event.type === type).map((event) => event.sessionId));
    const visitors = new Set(events.map((event) => event.sessionId)).size;
    const quoteOpenSessions = sessionsFor('quote_form_opened').size;
    const orderCreatedSessions = sessionsFor('order_created').size;

    const answeredCustomerRequests = recentRequests.filter((request) => (request.responses ?? []).length > 0);
    const targetedCustomerRequests = recentRequests.filter((request) => (request.contactedArtisanIds ?? []).length > 0);
    const routedServiceOrders = recentServiceOrders.filter((order) => !['pending_admin_validation', 'details_requested', 'rejected', 'cancelled'].includes(order.status));
    const answeredServiceOrders = recentServiceOrders.filter((order) => ['quote_pending', 'accepted', 'in_progress', 'delivered', 'completed', 'disputed'].includes(order.status));
    const quoteRequests = recentRequests.length + recentServiceOrders.length;
    const answeredRequests = answeredCustomerRequests.length + answeredServiceOrders.length;
    const targetedRequests = targetedCustomerRequests.length + routedServiceOrders.length;
    const acceptedQuotes = recentRequests.reduce((count, request) => count + (request.responses ?? []).filter((response) => response.status === 'accepted').length, 0)
      + recentServiceOrders.filter((order) => ['accepted', 'in_progress', 'delivered', 'completed', 'disputed'].includes(order.status)).length;
    const completedProductOrders = recentOrders.filter((order) => order.status === 'completed');
    const completedServiceOrders = recentServiceOrders.filter((order) => order.status === 'completed');
    const completedTransactions = completedProductOrders.length + completedServiceOrders.length;
    const realProductOrderIds = new Set(recentOrders.filter((order) => order.listing?.isDemo === false).map((order) => order.id));
    const completedProductOrderIds = new Set(completedProductOrders.map((order) => order.id));
    const verifiedProductReviews = productReviews.filter((review) => completedProductOrderIds.has(review.orderId) && realProductOrderIds.has(review.orderId));
    const completedServiceOrderIds = new Set(completedServiceOrders.map((order) => order.id));
    const verifiedServiceReviews = serviceReviews.filter((review) => completedServiceOrderIds.has(review.orderId));
    const verifiedReviews = verifiedProductReviews.length + verifiedServiceReviews.length;
    const clientTransactions = new Map<string, number>();
    for (const order of completedProductOrders) clientTransactions.set(order.buyerId, (clientTransactions.get(order.buyerId) ?? 0) + 1);
    for (const order of completedServiceOrders) clientTransactions.set(order.clientId, (clientTransactions.get(order.clientId) ?? 0) + 1);
    const returningClients = [...clientTransactions.values()].filter((count) => count > 1).length;
    const realSubscriptions = subscriptions.filter((subscription) => subscription.isDemo === false);
    const planMetrics = new Map<string, { plan: string; views: number; ctas: number; subscriptions: number; active: number; revenue: number }>();
    for (const event of events.filter((item) => item.type === 'pricing_view' || item.type === 'plan_cta_clicked')) {
      const plan = event.label ?? 'all';
      const metric = planMetrics.get(plan) ?? { plan, views: 0, ctas: 0, subscriptions: 0, active: 0, revenue: 0 };
      if (event.type === 'pricing_view') metric.views += 1;
      else metric.ctas += 1;
      planMetrics.set(plan, metric);
    }
    for (const subscription of realSubscriptions) {
      const plan = subscription.plan?.slug ?? subscription.planId;
      const metric = planMetrics.get(plan) ?? { plan, views: 0, ctas: 0, subscriptions: 0, active: 0, revenue: 0 };
      metric.subscriptions += 1;
      if (subscription.status === 'active') metric.active += 1;
      if (subscription.status === 'active' || subscription.status === 'cancelled') metric.revenue += Number(subscription.amount ?? 0);
      planMetrics.set(plan, metric);
    }

    const realShops = shops.filter((shop) => shop.isDemo === false);
    const realArtisanUsers = users.filter((user) => user.isDemo === false);
    const realArtisanIds = new Set(realArtisanUsers.map((user) => user.id));
    const completeProfileArtisanIds = new Set(realShops
      .filter((shop) => shop.status === 'active' && Boolean(shop.name?.trim() && shop.description?.trim() && shop.category?.trim() && shop.city?.trim()))
      .map((shop) => shop.sellerId)
      .filter((id) => realArtisanIds.has(id)));
    const realOfferArtisanIds = new Set([
      ...allListings.filter((listing) => listing.isDemo === false && listing.status === 'active').map((listing) => listing.sellerId),
      ...allServices.filter((service) => service.isDemo === false && service.status === 'approved').map((service) => service.artisan?.id).filter((id): id is string => Boolean(id)),
    ]);
    const respondedArtisanIds = new Set<string>();
    for (const request of recentRequests) {
      for (const response of request.responses ?? []) respondedArtisanIds.add(response.artisanId);
    }
    for (const order of recentServiceOrders.filter((item) => !['pending_admin_validation', 'details_requested', 'rejected', 'cancelled'].includes(item.status))) {
      respondedArtisanIds.add(order.artisanId);
    }
    const activeArtisanIds = new Set(realShops.filter((shop) => shop.status === 'active').map((shop) => shop.sellerId));
    const realVisitorProfileSessions = sessionsFor('artisan_profile_view');
    const whatsappSessions = sessionsFor('whatsapp_click');
    const profileWhatsappSessions = [...realVisitorProfileSessions].filter((session) => whatsappSessions.has(session)).length;
    const conversion = (numerator: number, denominator: number) => ({
      numerator,
      denominator,
      percent: denominator ? Math.round((numerator / denominator) * 100) : 0,
    });

    return {
      periodDays,
      funnel: {
        visitors,
        searches: countByType('search'),
        categoryViews: countByType('category_view'),
        artisanProfileViews: countByType('artisan_profile_view'),
        listingViews: countByType('listing_view'),
        whatsappClicks: countByType('whatsapp_click'),
        quoteFormsOpened: countByType('quote_form_opened'),
        quoteRequests,
        serviceRequests: recentServiceOrders.length,
        acceptedQuotes,
        orders: recentOrders.length,
        completedTransactions,
        verifiedReviews,
        returningClients,
      },
      conversion: {
        visitorToQuote: conversion(quoteOpenSessions, visitors),
        visitorToOrder: conversion(orderCreatedSessions, visitors),
        quoteToAnswer: conversion(answeredRequests, targetedRequests),
        profileViewToWhatsapp: conversion(profileWhatsappSessions, realVisitorProfileSessions.size),
        quoteToAcceptance: conversion(acceptedQuotes, quoteRequests),
        completionRate: conversion(completedTransactions, recentOrders.length + recentServiceOrders.length),
        completedOrderToReview: conversion(verifiedReviews, completedTransactions),
      },
      artisans: {
        registered: realArtisanUsers.length,
        profileComplete: completeProfileArtisanIds.size,
        withRealOffers: realOfferArtisanIds.size,
        receivedResponse: [...respondedArtisanIds].filter((id) => realArtisanIds.has(id)).length,
        active: activeArtisanIds.size,
        withIdentityVerified: realShops.filter((shop) => shop.identityVerified).length,
      },
      dataQuality: {
        demoEventsExcluded: allEvents.filter((event) => event.isDemo === true).length,
        unclassifiedEvents: allEvents.filter((event) => event.isDemo == null).length,
        demoRequestsExcluded: allRequests.filter((request) => request.isDemo === true).length,
        unclassifiedRequests: allRequests.filter((request) => request.isDemo == null).length,
        demoServiceOrdersExcluded: allServiceOrders.filter((order) => order.isDemo === true).length,
        unclassifiedServiceOrders: allServiceOrders.filter((order) => order.isDemo == null).length,
        demoListingsExcluded: allListings.filter((listing) => listing.isDemo).length,
        demoServicesExcluded: allServices.filter((service) => service.isDemo).length,
        unclassifiedShops: shops.filter((shop) => shop.isDemo == null).length,
        demoSubscriptionsExcluded: subscriptions.filter((subscription) => subscription.isDemo === true).length,
        unclassifiedSubscriptions: subscriptions.filter((subscription) => subscription.isDemo == null).length,
      },
      commercial: [...planMetrics.values()],
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

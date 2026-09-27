import { AnalyticsService } from './analytics.service.js';

const now = new Date();
const recent = new Date(now.getTime() - 60_000);

function createService() {
  const events = { find: vi.fn(), insert: vi.fn() };
  const requests = { find: vi.fn() };
  const listings = { find: vi.fn() };
  const orders = { find: vi.fn() };
  const reviews = { find: vi.fn() };
  const services = { find: vi.fn() };
  const serviceOrders = { find: vi.fn() };
  const serviceReviews = { find: vi.fn() };
  const shops = { find: vi.fn() };
  const subscriptions = { find: vi.fn() };
  const users = { find: vi.fn() };
  const service = new AnalyticsService(
    events as never,
    requests as never,
    listings as never,
    orders as never,
    reviews as never,
    services as never,
    serviceOrders as never,
    serviceReviews as never,
    shops as never,
    subscriptions as never,
    users as never,
  );
  return { service, events, requests, listings, orders, reviews, services, serviceOrders, serviceReviews, shops, subscriptions, users };
}

describe('AnalyticsService pilot funnel', () => {
  it('excludes demo and unclassified data and returns ratio numerators and denominators', async () => {
    const repos = createService();
    repos.events.find.mockResolvedValue([
      { type: 'search', sessionId: 'session-1', label: 'couture', city: 'Douala', isDemo: false, createdAt: recent },
      { type: 'artisan_profile_view', sessionId: 'session-1', label: 'Awa', isDemo: false, createdAt: recent },
      { type: 'whatsapp_click', sessionId: 'session-1', label: 'Awa', isDemo: false, createdAt: recent },
      { type: 'quote_form_opened', sessionId: 'session-1', label: 'demande', isDemo: false, createdAt: recent },
      { type: 'order_created', sessionId: 'session-1', label: 'commande', isDemo: false, createdAt: recent },
      { type: 'search', sessionId: 'demo-session', label: 'test', isDemo: true, createdAt: recent },
      { type: 'search', sessionId: 'legacy-session', label: 'old', isDemo: null, createdAt: recent },
    ]);
    repos.requests.find.mockResolvedValue([
      { id: 'request-real', clientId: 'client-1', isDemo: false, contactedArtisanIds: ['artisan-1'], responses: [{ artisanId: 'artisan-1', status: 'accepted' }], createdAt: recent },
      { id: 'request-demo', clientId: 'demo-client', isDemo: true, contactedArtisanIds: [], responses: [], createdAt: recent },
      { id: 'request-legacy', clientId: 'legacy-client', isDemo: null, contactedArtisanIds: [], responses: [], createdAt: recent },
    ]);
    repos.orders.find.mockResolvedValue([
      { id: 'order-real', buyerId: 'client-1', status: 'completed', listing: { isDemo: false }, createdAt: recent },
      { id: 'order-demo', buyerId: 'demo-client', status: 'completed', listing: { isDemo: true }, createdAt: recent },
      { id: 'order-legacy', buyerId: 'legacy-client', status: 'completed', listing: { isDemo: null }, createdAt: recent },
    ]);
    repos.serviceOrders.find.mockResolvedValue([
      { id: 'service-order-real', clientId: 'client-1', status: 'completed', isDemo: false, createdAt: recent },
      { id: 'service-order-demo', clientId: 'demo-client', status: 'completed', isDemo: true, createdAt: recent },
      { id: 'service-order-legacy', clientId: 'legacy-client', status: 'completed', isDemo: null, createdAt: recent },
    ]);
    repos.reviews.find.mockResolvedValue([
      { id: 'review-real', orderId: 'order-real', verified: true, order: { status: 'completed', listing: { isDemo: false } }, createdAt: recent },
      { id: 'review-demo', orderId: 'order-demo', verified: true, order: { status: 'completed', listing: { isDemo: true } }, createdAt: recent },
    ]);
    repos.serviceReviews.find.mockResolvedValue([
      { id: 'service-review-real', orderId: 'service-order-real', verified: true, order: { status: 'completed', isDemo: false }, createdAt: recent },
      { id: 'service-review-demo', orderId: 'service-order-demo', verified: true, order: { status: 'completed', isDemo: true }, createdAt: recent },
    ]);
    repos.listings.find.mockResolvedValue([
      { sellerId: 'artisan-1', isDemo: false, status: 'active' },
      { sellerId: 'demo-artisan', isDemo: true, status: 'active' },
    ]);
    repos.services.find.mockResolvedValue([
      { artisan: { id: 'artisan-2' }, isDemo: false, status: 'approved' },
      { artisan: { id: 'demo-artisan' }, isDemo: true, status: 'approved' },
    ]);
    repos.shops.find.mockResolvedValue([
      { sellerId: 'artisan-1', status: 'active', isDemo: false, identityVerified: true },
      { sellerId: 'demo-artisan', status: 'active', isDemo: true, identityVerified: true },
      { sellerId: 'legacy-artisan', status: 'active', isDemo: null, identityVerified: false },
    ]);
    repos.users.find.mockResolvedValue([
      { id: 'artisan-1', role: 'artisan', isDemo: false, createdAt: recent },
      { id: 'artisan-2', role: 'artisan', isDemo: false, createdAt: recent },
      { id: 'demo-artisan', role: 'artisan', isDemo: true, createdAt: recent },
    ]);
    repos.subscriptions.find.mockResolvedValue([]);

    const result = await repos.service.funnel(30);

    expect(result.funnel.visitors).toBe(1);
    expect(result.funnel.searches).toBe(1);
    expect(result.funnel.quoteRequests).toBe(2);
    expect(result.funnel.orders).toBe(1);
    expect(result.funnel.completedTransactions).toBe(2);
    expect(result.funnel.verifiedReviews).toBe(2);
    expect(result.funnel.returningClients).toBe(1);
    expect(result.conversion.visitorToQuote).toEqual({ numerator: 1, denominator: 1, percent: 100 });
    expect(result.conversion.visitorToOrder).toEqual({ numerator: 1, denominator: 1, percent: 100 });
    expect(result.conversion.quoteToAnswer).toEqual({ numerator: 2, denominator: 2, percent: 100 });
    expect(result.conversion.profileViewToWhatsapp).toEqual({ numerator: 1, denominator: 1, percent: 100 });
    expect(result.artisans.withRealOffers).toBe(2);
    expect(result.artisans.registered).toBe(2);
    expect(result.artisans.profileComplete).toBe(0);
    expect(result.artisans.receivedResponse).toBe(1);
    expect(result.artisans.active).toBe(1);
    expect(result.artisans.withIdentityVerified).toBe(1);
    expect(result.dataQuality.demoEventsExcluded).toBe(1);
    expect(result.dataQuality.unclassifiedEvents).toBe(1);
    expect(result.dataQuality.demoRequestsExcluded).toBe(1);
    expect(result.dataQuality.unclassifiedRequests).toBe(1);
    expect(result.dataQuality.demoServiceOrdersExcluded).toBe(1);
    expect(result.dataQuality.unclassifiedServiceOrders).toBe(1);
    expect(result.dataQuality.demoListingsExcluded).toBe(1);
    expect(result.dataQuality.demoServicesExcluded).toBe(1);
    expect(result.dataQuality.unclassifiedShops).toBe(1);
  });

  it('marque les nouveaux événements selon le mode demo explicite', async () => {
    const originalDemoMode = process.env.DEMO_MODE;
    const repos = createService();
    repos.events.insert.mockResolvedValue(undefined);

    try {
      process.env.DEMO_MODE = 'true';
      await repos.service.record({ type: 'search', sessionId: 'session-demo' });
      expect(repos.events.insert).toHaveBeenLastCalledWith(expect.objectContaining({ isDemo: true }));

      process.env.DEMO_MODE = 'false';
      await repos.service.record({ type: 'search', sessionId: 'session-real' });
      expect(repos.events.insert).toHaveBeenLastCalledWith(expect.objectContaining({ isDemo: false }));
    } finally {
      if (originalDemoMode === undefined) delete process.env.DEMO_MODE;
      else process.env.DEMO_MODE = originalDemoMode;
    }
  });
});

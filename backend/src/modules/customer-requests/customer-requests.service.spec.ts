import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CustomerRequestsService, scoreArtisanForRequest } from './customer-requests.service.js';

describe('CustomerRequestsService', () => {
  it('classe métier, proximité, budget, disponibilité et avis sans accepter un métier incohérent', () => {
    const request = {
      category: 'menuiserie',
      city: 'Douala',
      neighborhood: 'Akwa',
      budgetMin: 80000,
      budgetMax: 120000,
      requestedDate: null,
    };
    const strongMatch = scoreArtisanForRequest(request, {
      artisan: { location: 'Douala' },
      shops: [{ city: 'Douala', neighborhood: 'Akwa', category: 'Menuiserie', verifiedBadge: true, identityVerified: true, availability: 'available', successfulSales: 25 }],
      categories: ['menuiserie'],
      prices: [{ min: 90000, max: 110000, estimatedDays: 3 }],
      averageRating: 4.8,
    });
    const weakMatch = scoreArtisanForRequest(request, {
      artisan: { location: 'Yaoundé' },
      shops: [{ city: 'Yaoundé', neighborhood: 'Mvan', category: 'menuiserie', verifiedBadge: false, identityVerified: false, availability: 'unavailable', successfulSales: 0 }],
      categories: ['menuiserie'],
      prices: [{ min: 500000, max: 500000 }],
      averageRating: null,
    });
    const wrongTrade = scoreArtisanForRequest(request, {
      artisan: { location: 'Douala' },
      shops: [{ city: 'Douala', neighborhood: 'Akwa', category: 'Plomberie', verifiedBadge: true, identityVerified: true, availability: 'available', successfulSales: 25 }],
      categories: ['plomberie'],
      prices: [{ min: 90000, max: 110000 }],
      averageRating: 5,
    });

    expect(strongMatch).toBeGreaterThan(weakMatch);
    expect(strongMatch).toBeLessThanOrEqual(100);
    expect(wrongTrade).toBe(0);
  });

  const requests = {
    create: vi.fn(),
    save: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
  };
  const users = {
    findOne: vi.fn(),
    find: vi.fn(),
  };
  const listings = { find: vi.fn() };
  const services = { find: vi.fn() };
  const serviceReviews = { find: vi.fn().mockResolvedValue([]) };
  const shops = { find: vi.fn() };
  const notifications = {
    notify: vi.fn().mockResolvedValue(undefined),
    notifyAdmins: vi.fn().mockResolvedValue(undefined),
    hasRecent: vi.fn().mockResolvedValue(false),
  };
  const storage = { isEnabled: vi.fn().mockReturnValue(true), uploadBuffer: vi.fn() };
  const subscriptions = { findPremiumUserIds: vi.fn().mockResolvedValue(new Set<string>()) };
  const momo = { initiateCollectionPayment: vi.fn(), getPaymentStatus: vi.fn() };

  let service: CustomerRequestsService;

  beforeEach(() => {
    vi.clearAllMocks();
    users.find.mockResolvedValue([]);
    service = new CustomerRequestsService(
      requests as never,
      users as never,
      listings as never,
      services as never,
      serviceReviews as never,
      shops as never,
      notifications as never,
      storage as never,
      subscriptions as never,
      momo as never,
    );
  });

  it('lists only real targeted requests older than 24 hours with unanswered artisans', async () => {
    const oldRequest = {
      id: 'request-old', clientId: 'client-1', status: 'contacted', isDemo: false,
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
      contactedArtisanIds: ['artisan-1', 'artisan-2'],
      responses: [{ artisanId: 'artisan-1', message: 'Je peux le faire.' }],
    };
    requests.find.mockResolvedValue([
      oldRequest,
      { ...oldRequest, id: 'request-recent', createdAt: new Date() },
      { ...oldRequest, id: 'request-demo', isDemo: true },
      { ...oldRequest, id: 'request-answered', contactedArtisanIds: ['artisan-1'], responses: [{ artisanId: 'artisan-1', message: 'Offre envoyée.' }] },
    ]);
    users.find.mockResolvedValue([{ id: 'client-1', name: 'Client test', email: 'client@test.cm' }]);
    notifications.hasRecent.mockResolvedValue(false);

    const result = await service.findRequestsAwaitingResponseForAdmin();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'request-old',
      pendingArtisanIds: ['artisan-2'],
      relaunchableArtisanIds: ['artisan-2'],
      client: { id: 'client-1', name: 'Client test' },
    });
  });

  it('reminds only targeted artisans who have not responded and are outside cooldown', async () => {
    requests.findOne.mockResolvedValue({
      id: 'request-1', status: 'contacted', isDemo: false,
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
      contactedArtisanIds: ['artisan-replied', 'artisan-pending', 'artisan-recently-reminded'],
      responses: [{ artisanId: 'artisan-replied', message: 'Je réponds demain.' }],
      category: 'menuiserie', city: 'Douala', neighborhood: 'Akwa',
    });
    notifications.hasRecent.mockImplementation(async (artisanId: string) => artisanId === 'artisan-recently-reminded');

    const result = await service.remindUnansweredArtisans('request-1');

    expect(result).toEqual({ success: true, notifiedCount: 1, pendingCount: 2 });
    expect(notifications.notify).toHaveBeenCalledOnce();
    expect(notifications.notify).toHaveBeenCalledWith(expect.objectContaining({
      recipientId: 'artisan-pending',
      relatedId: 'request-1',
    }));
  });

  it('does not send a follow-up before 24 hours', async () => {
    requests.findOne.mockResolvedValue({
      id: 'request-recent', status: 'contacted', isDemo: false,
      createdAt: new Date(), contactedArtisanIds: ['artisan-1'], responses: [],
    });

    await expect(service.remindUnansweredArtisans('request-recent')).rejects.toThrow('après 24 heures');
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it('bloque la publication d’une demande en mode démonstration avant toute écriture', async () => {
    const originalDemoMode = process.env.DEMO_MODE;
    process.env.DEMO_MODE = 'true';

    try {
      await expect(service.create('client-1', {
        category: 'menuiserie',
        city: 'Douala',
        description: 'Je souhaite faire fabriquer une table pour mon salon.',
      })).rejects.toBeInstanceOf(ForbiddenException);
      expect(requests.save).not.toHaveBeenCalled();
    } finally {
      if (originalDemoMode === undefined) delete process.env.DEMO_MODE;
      else process.env.DEMO_MODE = originalDemoMode;
    }
  });

  it('encaisse le prix convenu après livraison, puis clôture la demande', async () => {
    const request = {
      id: 'request-1',
      clientId: 'client-1',
      category: 'menuiserie',
      city: 'Douala',
      status: 'in_progress',
      paymentStatus: 'unpaid',
      deliveredAt: null as Date | null,
      responses: [{ artisanId: 'artisan-1', price: 50000, message: 'offre', status: 'accepted', createdAt: new Date().toISOString() }],
    };
    requests.findOne.mockResolvedValue(request);
    requests.save.mockImplementation(async (value) => value);

    await expect(service.pay('client-1', 'request-1', { method: 'cash' })).rejects.toBeInstanceOf(BadRequestException);
    await service.markDelivered('artisan-1', 'request-1');
    await service.pay('client-1', 'request-1', { method: 'cash' });
    expect(request).toEqual(expect.objectContaining({ paymentStatus: 'pending', paymentMethod: 'cash', paymentAmount: 50000 }));
    await expect(service.confirmCash('artisan-2', 'request-1')).rejects.toBeInstanceOf(ForbiddenException);

    await service.confirmCash('artisan-1', 'request-1');
    expect(request).toEqual(expect.objectContaining({ paymentStatus: 'paid', status: 'completed' }));
  });

  it('cible les artisans du métier et notifie uniquement ceux-là', async () => {
    const created = { id: 'request-1', clientId: 'client-1', category: 'menuiserie', city: 'Douala', description: 'Je cherche une cuisine sur mesure avec installation complète.', contactedArtisanIds: [] };
    requests.create.mockReturnValue(created);
    requests.save.mockResolvedValue(created);
    users.find.mockResolvedValue([
      { id: 'artisan-menuisier', role: 'artisan', isActive: true, location: 'Douala', email: 'menuisier@test.cm', whatsappPhone: '+237699000001' },
      { id: 'artisan-couturier', role: 'artisan', isActive: true, location: 'Douala', email: 'couture@test.cm' },
    ]);
    shops.find.mockResolvedValue([{ sellerId: 'artisan-menuisier', city: 'Douala', neighborhood: 'Akwa', verifiedBadge: true }]);
    listings.find.mockResolvedValue([
      { sellerId: 'artisan-menuisier', category: 'menuiserie' },
      { sellerId: 'artisan-couturier', category: 'couture' },
    ]);
    services.find.mockResolvedValue([]);

    const result = await service.create('client-1', {
      category: 'menuiserie',
      city: 'Douala',
      description: 'Je cherche une cuisine sur mesure avec installation complète.',
      budgetMin: 200000,
      budgetMax: 500000,
    });

    expect(requests.create).toHaveBeenCalledWith(expect.objectContaining({ clientId: 'client-1', status: 'new', category: 'menuiserie', city: 'Douala' }));
    expect(notifications.notify).toHaveBeenCalledTimes(1);
    expect(notifications.notify).toHaveBeenCalledWith(expect.objectContaining({
      recipientId: 'artisan-menuisier',
      link: '/artisan/customer-requests',
      relatedId: 'request-1',
    }));
    expect(result.contactedArtisanIds).toEqual(['artisan-menuisier']);
  });

  it('met un brief B2B en revue admin sans contacter automatiquement des artisans', async () => {
    const created = { id: 'request-b2b', clientId: 'client-1', requestType: 'business', organizationName: 'Hôtel Central', requestedQuantity: 40, category: 'menuiserie', city: 'Douala', description: 'Fourniture de quarante chaises solides pour les salles de réunion de notre établissement.', contactedArtisanIds: [] };
    requests.create.mockReturnValue(created);
    requests.save.mockResolvedValue(created);
    users.find.mockResolvedValue([{ id: 'artisan-1', role: 'artisan', isActive: true, location: 'Douala' }]);

    const result = await service.create('client-1', {
      requestType: 'business',
      organizationName: 'Hôtel Central',
      requestedQuantity: 40,
      category: 'menuiserie',
      city: 'Douala',
      description: 'Fourniture de quarante chaises solides pour les salles de réunion de notre établissement.',
    });

    expect(requests.create).toHaveBeenCalledWith(expect.objectContaining({
      requestType: 'business',
      organizationName: 'Hôtel Central',
      requestedQuantity: 40,
      contactedArtisanIds: [],
    }));
    expect(notifications.notifyAdmins).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Demande B2B à examiner',
      link: '/admin/customer-requests',
      relatedId: 'request-b2b',
    }));
    expect(notifications.notify).not.toHaveBeenCalled();
    expect(result.contactedArtisanIds).toEqual([]);
  });

  it('exige entreprise et quantité pour un brief B2B', async () => {
    await expect(service.create('client-1', {
      requestType: 'business',
      category: 'menuiserie',
      city: 'Douala',
      description: 'Fourniture de mobilier professionnel pour une nouvelle salle de réunion.',
      requestedQuantity: 10,
    })).rejects.toBeInstanceOf(BadRequestException);

    await expect(service.create('client-1', {
      requestType: 'business',
      organizationName: 'Entreprise locale',
      category: 'menuiserie',
      city: 'Douala',
      description: 'Fourniture de mobilier professionnel pour une nouvelle salle de réunion.',
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(requests.save).not.toHaveBeenCalled();
  });

  it('permet à l’admin de choisir des artisans correspondants pour un brief B2B', async () => {
    const request = {
      id: 'request-b2b',
      clientId: 'client-1',
      requestType: 'business',
      organizationName: 'Hôtel Central',
      requestedQuantity: 40,
      category: 'menuiserie',
      city: 'Douala',
      neighborhood: null,
      budgetMin: null,
      budgetMax: null,
      requestedDate: null,
      description: 'Fourniture de quarante chaises solides pour les salles de réunion de notre établissement.',
      contactedArtisanIds: [],
      status: 'new',
    };
    requests.findOne.mockResolvedValue(request);
    requests.save.mockImplementation(async (value) => value);
    users.find.mockResolvedValue([{ id: 'artisan-1', name: 'Menuisier Douala', location: 'Douala' }]);
    shops.find.mockResolvedValue([{ sellerId: 'artisan-1', city: 'Douala', neighborhood: 'Akwa', category: 'menuiserie', verifiedBadge: true, identityVerified: false, availability: 'available', successfulSales: 4 }]);
    listings.find.mockResolvedValue([{ sellerId: 'artisan-1', category: 'menuiserie', type: 'product' }]);
    services.find.mockResolvedValue([]);
    serviceReviews.find.mockResolvedValue([]);

    const result = await service.assignBusinessArtisans('request-b2b', ['artisan-1']);

    expect(result).toEqual({ success: true, contactedArtisanIds: ['artisan-1'] });
    expect(request).toMatchObject({ status: 'contacted', contactedArtisanIds: ['artisan-1'] });
    expect(notifications.notify).toHaveBeenCalledWith(expect.objectContaining({
      recipientId: 'artisan-1',
      title: 'Nouvelle opportunité professionnelle B2B',
      relatedId: 'request-b2b',
    }));
  });

  it('ne montre pas les briefs B2B aux artisans avant leur assignation', async () => {
    requests.find.mockResolvedValue([{
      id: 'request-b2b',
      clientId: 'client-1',
      requestType: 'business',
      status: 'new',
      category: 'menuiserie',
      city: 'Douala',
      contactedArtisanIds: [],
      responses: [],
      createdAt: '2026-09-28T10:00:00.000Z',
    }]);
    users.findOne.mockResolvedValue({ id: 'artisan-1', location: 'Douala' });
    shops.find.mockResolvedValue([{ city: 'Douala', category: 'menuiserie', availability: 'available', successfulSales: 1 }]);
    listings.find.mockResolvedValue([{ category: 'menuiserie', type: 'product' }]);
    services.find.mockResolvedValue([]);
    serviceReviews.find.mockResolvedValue([]);
    users.find.mockResolvedValue([]);

    const result = await service.findOpenForArtisan('artisan-1');

    expect(result).toEqual([]);
  });

  it('notifie les administrateurs quand aucun artisan ne correspond', async () => {
    const created = { id: 'request-no-match', clientId: 'client-1', category: 'verrerie', city: 'Bafoussam', description: 'Je cherche un artisan verrier pour une installation complète.', contactedArtisanIds: [] };
    requests.create.mockReturnValue(created);
    requests.save.mockResolvedValue(created);
    users.find.mockResolvedValue([]);
    shops.find.mockResolvedValue([]);
    listings.find.mockResolvedValue([]);
    services.find.mockResolvedValue([]);

    await service.create('client-1', {
      category: 'verrerie',
      city: 'Bafoussam',
      description: 'Je cherche un artisan verrier pour une installation complète.',
    });

    expect(notifications.notifyAdmins).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Demande client sans artisan correspondant',
      link: '/admin/customer-requests',
      relatedId: 'request-no-match',
    }));
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it('retargets a saved unmatched request when a matching artisan becomes available', async () => {
    const request = {
      id: 'request-engineer',
      clientId: 'client-1',
      requestType: 'personal',
      status: 'new',
      isDemo: false,
      category: 'Ingénieur en génie civil',
      city: 'Yaoundé',
      neighborhood: 'Bastos',
      description: 'Je cherche un ingénieur en génie civil pour préparer les plans de construction de ma maison.',
      contactedArtisanIds: [],
      responses: [],
      createdAt: new Date(),
    };
    requests.find.mockResolvedValue([request]);
    requests.findOne.mockResolvedValue({ ...request, contactedArtisanIds: [] });
    requests.save.mockImplementation(async (value) => value);
    users.find.mockResolvedValue([{ id: 'engineer-1', role: 'artisan', isActive: true, location: 'Yaoundé', name: 'Ingénieur Paul' }]);
    shops.find.mockResolvedValue([{
      id: 'shop-engineer', sellerId: 'engineer-1', category: 'Ingénieur en génie civil', city: 'Yaoundé',
      neighborhood: 'Bastos', availability: 'available', identityVerified: true, verifiedBadge: true, successfulSales: 0,
    }]);
    listings.find.mockResolvedValue([]);
    services.find.mockResolvedValue([]);
    serviceReviews.find.mockResolvedValue([]);
    subscriptions.findPremiumUserIds.mockResolvedValue(new Set());

    await expect(service.matchUnmatchedRequestsForArtisan('engineer-1')).resolves.toEqual({ matchedRequests: 1, notifiedArtisans: 1 });
    expect(requests.save).toHaveBeenCalledWith(expect.objectContaining({ contactedArtisanIds: ['engineer-1'] }));
    expect(notifications.notify).toHaveBeenCalledWith(expect.objectContaining({
      recipientId: 'engineer-1',
      title: 'Une demande correspond à votre activité à Bastos',
      link: expect.stringContaining('/artisan/customer-requests?'),
      relatedId: 'request-engineer',
    }));
  });

  it('groups real unmet demand by normalized trade and city for recruitment priorities', async () => {
    requests.find.mockResolvedValue([
      { requestType: 'personal', isDemo: false, category: 'Plombier', city: 'Douala', createdAt: new Date('2026-09-02'), contactedArtisanIds: [] },
      { requestType: 'personal', isDemo: false, category: 'plombier', city: 'Douala', createdAt: new Date('2026-09-03'), contactedArtisanIds: ['artisan-1'] },
      { requestType: 'personal', isDemo: true, category: 'Plombier', city: 'Douala', createdAt: new Date('2026-09-04'), contactedArtisanIds: [] },
    ]);

    const result = await service.demandSummaryForAdmin();

    expect(result).toMatchObject({ totalRequests: 2, totalUnmatched: 1 });
    expect(result.demands).toEqual([expect.objectContaining({ category: 'Plombier', city: 'Douala', requests: 2, unmatched: 1 })]);
  });

  it('enregistre la réponse admin et notifie le client', async () => {
    const request = {
      id: 'request-no-match',
      clientId: 'client-1',
      category: 'automatisme',
      city: 'Garoua',
      contactedArtisanIds: [],
      adminReply: null as string | null,
      adminRepliedAt: null as Date | null,
    };
    requests.findOne.mockResolvedValue(request);
    requests.save.mockImplementation(async (value) => value);
    users.findOne.mockResolvedValue({ id: 'client-1', name: 'Amina', email: 'amina@example.cm' });

    const result = await service.replyAsAdmin('request-no-match', 'Nous recherchons un artisan compatible et vous recontactons.');

    expect(requests.save).toHaveBeenCalledWith(expect.objectContaining({
      adminReply: 'Nous recherchons un artisan compatible et vous recontactons.',
      adminRepliedAt: expect.any(Date),
    }));
    expect(notifications.notify).toHaveBeenCalledWith(expect.objectContaining({
      recipientId: 'client-1',
      title: 'Réponse de l’équipe ArtisanConnect',
      content: 'Nous recherchons un artisan compatible et vous recontactons.',
      link: '/customer-requests',
    }));
    expect(result.success).toBe(true);
  });

  it('refuse une réponse admin vide', async () => {
    await expect(service.replyAsAdmin('request-no-match', '  ')).rejects.toBeInstanceOf(BadRequestException);
    expect(requests.findOne).not.toHaveBeenCalled();
  });

  it('refuse une demande sans description suffisante', async () => {
    await expect(service.create('client-1', { category: 'couture', city: 'Yaoundé', description: 'trop court' })).rejects.toBeInstanceOf(BadRequestException);
    expect(requests.save).not.toHaveBeenCalled();
  });

  it('filtre les demandes par catégorie et ville selon le profil artisan', async () => {
    requests.find.mockResolvedValue([
      { id: 'match', status: 'new', category: 'menuiserie', city: 'Douala', createdAt: '2025-01-02T09:00:00.000Z' },
      { id: 'other-city', status: 'new', category: 'menuiserie', city: 'Yaoundé', createdAt: '2025-01-02T09:00:00.000Z' },
      { id: 'other-category', status: 'new', category: 'couture', city: 'Douala', createdAt: '2025-01-02T09:00:00.000Z' },
    ]);
    users.findOne.mockResolvedValue({ id: 'artisan-1', location: 'Douala' });
    shops.find.mockResolvedValue([{ city: 'Douala', neighborhood: 'Bonamoussadi' }]);
    listings.find.mockResolvedValue([{ category: 'menuiserie' }]);
    services.find.mockResolvedValue([]);

    const result = await service.findOpenForArtisan('artisan-1', 'menuiserie', 'Douala');

    expect(result.map((request) => request.id)).toEqual(['match']);
  });

  it('masque les demandes hors métier tout en conservant celles auxquelles l’artisan a répondu', async () => {
    requests.find.mockResolvedValue([
      { id: 'wrong-trade', clientId: 'client-1', status: 'new', category: 'AUTOMATICIEN', city: 'Garoua', responses: [], createdAt: '2025-01-02T10:00:00.000Z' },
      { id: 'answered-before-profile-change', clientId: 'client-2', status: 'contacted', category: 'AUTOMATICIEN', city: 'Garoua', responses: [{ artisanId: 'artisan-1', message: 'Mon offre', createdAt: '2025-01-02T09:00:00.000Z' }], createdAt: '2025-01-02T08:00:00.000Z' },
    ]);
    users.findOne.mockResolvedValue({ id: 'artisan-1', location: 'Garoua' });
    users.find.mockResolvedValue([]);
    shops.find.mockResolvedValue([]);
    listings.find.mockResolvedValue([{ category: 'plomberie' }]);
    services.find.mockResolvedValue([]);

    const result = await service.findOpenForArtisan('artisan-1');

    expect(result.map((request) => request.id)).toEqual(['answered-before-profile-change']);
  });

  it('affiche le nom et uniquement le numéro de contact autorisé par le client', async () => {
    requests.find.mockResolvedValue([
      { id: 'request-whatsapp', clientId: 'client-wa', status: 'new', category: 'menuiserie', city: 'Douala', contactPreference: 'whatsapp', contactPhone: '+237699000001', createdAt: '2025-01-02T09:00:00.000Z' },
      { id: 'request-platform', clientId: 'client-platform', status: 'new', category: 'menuiserie', city: 'Douala', contactPreference: 'platform', contactPhone: null, createdAt: '2025-01-02T08:00:00.000Z' },
    ]);
    users.findOne.mockResolvedValue({ id: 'artisan-1', location: 'Douala' });
    users.find.mockResolvedValue([
      { id: 'client-wa', name: 'Nadia', phone: '+237699000001' },
      { id: 'client-platform', name: 'Paul', phone: '+237699000002' },
    ]);
    shops.find.mockResolvedValue([]);
    listings.find.mockResolvedValue([{ category: 'menuiserie' }]);
    services.find.mockResolvedValue([]);

    const result = await service.findOpenForArtisan('artisan-1');

    expect(result[0]).toEqual(expect.objectContaining({ client: { name: 'Nadia', contactPreference: 'whatsapp', contactPhone: '+237699000001' } }));
    expect(result[1]).toEqual(expect.objectContaining({ client: { name: 'Paul', contactPreference: 'platform', contactPhone: null } }));
  });

  it('affiche le nom du client et masque son téléphone sans accord WhatsApp', async () => {
    requests.find.mockResolvedValue([
      { id: 'request-whatsapp', clientId: 'client-wa', status: 'new', category: 'menuiserie', city: 'Douala', contactPreference: 'whatsapp', contactPhone: '+237699000001', createdAt: '2025-01-02T09:00:00.000Z' },
      { id: 'request-platform', clientId: 'client-platform', status: 'new', category: 'menuiserie', city: 'Douala', contactPreference: 'platform', contactPhone: null, createdAt: '2025-01-02T08:00:00.000Z' },
    ]);
    users.findOne.mockResolvedValue({ id: 'artisan-1', location: 'Douala' });
    users.find.mockResolvedValue([
      { id: 'client-wa', name: 'Nadia', phone: '+237699000001' },
      { id: 'client-platform', name: 'Paul', phone: '+237699000002' },
    ]);
    shops.find.mockResolvedValue([]);
    listings.find.mockResolvedValue([{ category: 'menuiserie' }]);
    services.find.mockResolvedValue([]);

    const result = await service.findOpenForArtisan('artisan-1');

    expect(result[0]).toEqual(expect.objectContaining({ client: { name: 'Nadia', contactPreference: 'whatsapp', contactPhone: '+237699000001' } }));
    expect(result[1]).toEqual(expect.objectContaining({ client: { name: 'Paul', contactPreference: 'platform', contactPhone: null } }));
  });

  it('refuse une seconde réponse du même artisan', async () => {
    requests.findOne.mockResolvedValue({
      id: 'request-1',
      clientId: 'client-1',
      status: 'new',
      responses: [{ artisanId: 'artisan-1', message: 'déjà répondu', createdAt: new Date().toISOString() }],
      contactedArtisanIds: ['artisan-1'],
    });

    await expect(service.respond('artisan-1', 'request-1', { message: 'Nouvelle réponse' })).rejects.toBeInstanceOf(BadRequestException);
    expect(requests.save).not.toHaveBeenCalled();
  });

  it('masque une demande pourvue aux artisans qui n’ont pas répondu', async () => {
    requests.find.mockResolvedValue([
      { id: 'awarded', status: 'in_progress', category: 'menuiserie', city: 'Douala', createdAt: '2025-01-02T09:00:00.000Z', responses: [{ artisanId: 'artisan-2', message: 'offre', status: 'accepted', createdAt: '2025-01-02T10:00:00.000Z' }] },
    ]);
    users.findOne.mockResolvedValue({ id: 'artisan-1', location: 'Douala' });
    shops.find.mockResolvedValue([]);
    listings.find.mockResolvedValue([{ category: 'menuiserie' }]);
    services.find.mockResolvedValue([]);

    expect(await service.findOpenForArtisan('artisan-1')).toEqual([]);
    const [forWinner] = await service.findOpenForArtisan('artisan-2');
    expect(forWinner).toEqual(expect.objectContaining({ awarded: true, awardedToMe: true }));
    expect(forWinner).not.toHaveProperty('responses');
  });

  it('refuse la modification d’offre à un artisan non retenu', async () => {
    requests.findOne.mockResolvedValue({
      id: 'request-1',
      clientId: 'client-1',
      status: 'in_progress',
      responses: [
        { artisanId: 'artisan-1', message: 'offre', status: 'rejected', createdAt: new Date().toISOString() },
        { artisanId: 'artisan-2', message: 'offre', status: 'accepted', createdAt: new Date().toISOString() },
      ],
    });

    await expect(service.updateResponse('artisan-1', 'request-1', { price: 1000 })).rejects.toBeInstanceOf(BadRequestException);
    expect(requests.save).not.toHaveBeenCalled();
  });

  it('enregistre la réponse et notifie le client', async () => {
    const request = { id: 'request-1', clientId: 'client-1', status: 'new', responses: [], contactedArtisanIds: [] };
    requests.findOne.mockResolvedValue(request);
    requests.save.mockResolvedValue(request);
    notifications.notify.mockResolvedValue(undefined);

    await service.respond('artisan-1', 'request-1', { price: 250000, days: 15, message: 'Je peux réaliser votre projet.' });

    expect(requests.save).toHaveBeenCalledWith(expect.objectContaining({ responses: [expect.objectContaining({ artisanId: 'artisan-1', price: 250000, days: 15 })] }));
    expect(notifications.notify).toHaveBeenCalledWith(expect.objectContaining({ recipientId: 'client-1', relatedId: 'request-1' }));
  });

  it('calcule le taux et le délai de réponse sur les seules demandes adressées', async () => {
    requests.find.mockResolvedValue([
      {
        id: 'request-1',
        clientId: 'client-1',
        status: 'contacted',
        createdAt: '2025-01-01T09:00:00.000Z',
        contactedArtisanIds: ['artisan-1', 'artisan-2'],
        responses: [
          { artisanId: 'artisan-1', createdAt: '2025-01-01T09:15:00.000Z', message: 'Réponse 1' },
          { artisanId: 'artisan-2', createdAt: '2025-01-01T09:45:00.000Z', message: 'Réponse 2' },
        ],
      },
      {
        id: 'request-2',
        clientId: 'client-2',
        status: 'contacted',
        createdAt: '2025-01-01T11:00:00.000Z',
        contactedArtisanIds: ['artisan-1'],
        responses: [
          { artisanId: 'artisan-1', createdAt: '2025-01-01T11:30:00.000Z', message: 'Réponse 3' },
        ],
      },
      {
        id: 'request-3',
        clientId: 'client-3',
        status: 'new',
        createdAt: '2025-01-01T12:00:00.000Z',
        contactedArtisanIds: ['artisan-2'],
        responses: [],
      },
    ]);

    const result = await service.statsForArtisan('artisan-1');

    expect(result.requestsReceived).toBe(2);
    expect(result.responsesSent).toBe(2);
    expect(result.averageResponseMinutes).toBe(23);
  });

  it('refuse au client l’accès à la demande d’un autre utilisateur', async () => {
    requests.findOne.mockResolvedValue({ id: 'request-1', clientId: 'other-client' });

    await expect(service.findOneForUser('client-1', 'request-1')).rejects.toBeInstanceOf(ForbiddenException);
  });
});

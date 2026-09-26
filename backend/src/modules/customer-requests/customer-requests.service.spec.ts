import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CustomerRequestsService } from './customer-requests.service.js';

describe('CustomerRequestsService', () => {
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
  const shops = { find: vi.fn() };
  const notifications = {
    notify: vi.fn().mockResolvedValue(undefined),
    notifyAdmins: vi.fn().mockResolvedValue(undefined),
  };
  const emails = { send: vi.fn().mockResolvedValue(true) };
  const storage = { isEnabled: vi.fn().mockReturnValue(true), uploadBuffer: vi.fn() };
  const subscriptions = { findPremiumUserIds: vi.fn().mockResolvedValue(new Set<string>()) };
  const momo = { initiateCollectionPayment: vi.fn(), getPaymentStatus: vi.fn() };
  const whatsApp = {
    sendServiceRequest: vi.fn().mockResolvedValue(false),
    sendAdminNoMatch: vi.fn().mockResolvedValue(false),
  };

  let service: CustomerRequestsService;

  beforeEach(() => {
    vi.clearAllMocks();
    users.find.mockResolvedValue([]);
    service = new CustomerRequestsService(
      requests as never,
      users as never,
      listings as never,
      services as never,
      shops as never,
      notifications as never,
      emails as never,
      storage as never,
      subscriptions as never,
      momo as never,
      whatsApp as never,
    );
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
    expect(emails.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'menuisier@test.cm' }));
    expect(whatsApp.sendServiceRequest).toHaveBeenCalledWith('+237699000001', expect.any(Array));
    expect(result.contactedArtisanIds).toEqual(['artisan-menuisier']);
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
      link: '/admin',
      relatedId: 'request-no-match',
    }));
    expect(whatsApp.sendAdminNoMatch).toHaveBeenCalledWith(expect.stringContaining('Aucun artisan actif'), expect.stringContaining('/admin'));
    expect(notifications.notify).not.toHaveBeenCalled();
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

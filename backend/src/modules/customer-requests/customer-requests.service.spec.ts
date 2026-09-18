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
  const notifications = { notify: vi.fn() };
  const emails = { send: vi.fn().mockResolvedValue(true) };

  let service: CustomerRequestsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CustomerRequestsService(
      requests as never,
      users as never,
      listings as never,
      services as never,
      shops as never,
      notifications as never,
      emails as never,
    );
  });

  it('cible les artisans du métier et notifie uniquement ceux-là', async () => {
    const created = { id: 'request-1', clientId: 'client-1', category: 'menuiserie', city: 'Douala', description: 'Je cherche une cuisine sur mesure avec installation complète.', contactedArtisanIds: [] };
    requests.create.mockReturnValue(created);
    requests.save.mockResolvedValue(created);
    users.find.mockResolvedValue([
      { id: 'artisan-menuisier', role: 'artisan', isActive: true, location: 'Douala', email: 'menuisier@test.cm' },
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
    expect(result.contactedArtisanIds).toEqual(['artisan-menuisier']);
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

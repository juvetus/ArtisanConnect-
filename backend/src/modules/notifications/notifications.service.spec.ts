import { NotificationsService } from './notifications.service.js';

describe('NotificationsService opportunity alerts', () => {
  const repository = {
    create: vi.fn((value) => value),
    save: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
  };
  const users = { findOne: vi.fn() };
  const email = { send: vi.fn().mockResolvedValue(true) };
  const whatsApp = { sendNotification: vi.fn().mockResolvedValue(true) };

  beforeEach(() => vi.clearAllMocks());

  it('counts only unread opportunity alerts for the artisan', async () => {
    const service = new NotificationsService(repository as never);

    await service.unreadOpportunityCount('artisan-1');

    expect(repository.count).toHaveBeenCalledWith({
      where: { recipientId: 'artisan-1', read: false, title: 'Nouvelle demande client pour vous' },
    });
  });

  it('marks only opportunity alerts as read', async () => {
    const service = new NotificationsService(repository as never);

    await service.markOpportunityNotificationsRead('artisan-1');

    expect(repository.update).toHaveBeenCalledWith(
      { recipientId: 'artisan-1', read: false, title: 'Nouvelle demande client pour vous' },
      { read: true },
    );
  });

  it('envoie aussi un e-mail et WhatsApp au destinataire renseigné', async () => {
    repository.save.mockImplementation(async (value) => ({ id: 'notification-1', ...value }));
    users.findOne.mockResolvedValue({
      id: 'artisan-1',
      role: 'artisan',
      name: 'Awa',
      email: 'awa@example.cm',
      phone: '+237699000001',
      whatsappPhone: '+237699000002',
    });
    const service = new NotificationsService(repository as never, users as never, email as never, whatsApp as never);

    const result = await service.notify({
      recipientId: 'artisan-1',
      type: 'new_order',
      title: 'Nouvelle commande',
      content: 'Une commande vous attend.',
      link: '/dashboard',
    });

    expect(result.id).toBe('notification-1');
    expect(email.send).toHaveBeenCalledWith(expect.objectContaining({
      to: 'awa@example.cm',
      subject: '[ArtisanConnect] Nouvelle commande',
    }));
    expect(whatsApp.sendNotification).toHaveBeenCalledWith(
      '+237699000002',
      'Awa',
      'Nouvelle commande',
      'Une commande vous attend.',
      expect.stringContaining('/dashboard'),
      false,
    );
  });

  it('ne fait pas échouer la notification interne si les canaux externes échouent', async () => {
    repository.save.mockImplementation(async (value) => ({ id: 'notification-2', ...value }));
    users.findOne.mockResolvedValue({ id: 'client-1', role: 'client', email: 'client@example.cm', phone: '+237699000003' });
    email.send.mockRejectedValue(new Error('SMTP indisponible'));
    whatsApp.sendNotification.mockRejectedValue(new Error('Meta indisponible'));
    const service = new NotificationsService(repository as never, users as never, email as never, whatsApp as never);

    await expect(service.notify({
      recipientId: 'client-1',
      type: 'general',
      title: 'Information',
      content: 'Message de test',
    })).resolves.toEqual(expect.objectContaining({ id: 'notification-2' }));
  });
});
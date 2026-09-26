import { NotificationsService } from './notifications.service.js';

describe('NotificationsService opportunity alerts', () => {
  const repository = {
    count: vi.fn(),
    update: vi.fn(),
  };

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
});
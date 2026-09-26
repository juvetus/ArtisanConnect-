import { ConflictException } from '@nestjs/common';
import { ServiceOrdersService } from './service-orders.service.js';

describe('ServiceOrdersService', () => {
  const orderRepository = {
    count: vi.fn(),
    create: vi.fn((value) => value),
    save: vi.fn(),
    findOne: vi.fn(),
  };
  const transactionManager = {
    findOne: vi.fn(),
    getRepository: vi.fn().mockReturnValue(orderRepository),
  };
  const orders = {
    ...orderRepository,
    manager: {
      transaction: vi.fn((callback: (manager: typeof transactionManager) => Promise<unknown>) => callback(transactionManager)),
    },
  };
  const services = { findOne: vi.fn() };
  const quotes = {};
  const payments = {};
  const users = { find: vi.fn() };
  const notifications = { notify: vi.fn() };

  let service: ServiceOrdersService;

  beforeEach(() => {
    vi.clearAllMocks();
    transactionManager.findOne.mockResolvedValue({ id: 'service-1', status: 'approved' });
    transactionManager.getRepository.mockReturnValue(orderRepository);
    service = new ServiceOrdersService(
      orders as never,
      services as never,
      quotes as never,
      payments as never,
      users as never,
      notifications as never,
    );
    services.findOne.mockResolvedValue({
      id: 'service-1',
      status: 'approved',
      title: 'Confection sur mesure',
      artisan: { id: 'artisan-1', name: 'Awa', email: 'awa@example.cm', phone: '+237699000001' },
    });
  });

  const requestData = {
    serviceId: 'service-1',
    projectObjective: 'Je souhaite une confection sur mesure pour un événement familial important.',
    deliveryMethod: 'workshop' as const,
    clientConfirmed: true,
    termsAccepted: true,
  };

  it('refuse une nouvelle demande si le client a déjà une demande active pour ce service', async () => {
    orders.count.mockResolvedValue(1);

    await expect(service.createOrder('client-1', requestData)).rejects.toBeInstanceOf(ConflictException);
    expect(orders.save).not.toHaveBeenCalled();
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it('notifie l’artisan via le service central de notifications', async () => {
    const createdOrder = { id: 'order-1', clientId: 'client-1', artisanId: 'artisan-1' };
    orders.count.mockResolvedValue(0);
    orders.save.mockResolvedValue(createdOrder);
    orders.findOne.mockResolvedValue(createdOrder);
    users.find.mockResolvedValue([]);

    await service.createOrder('client-1', requestData);

    expect(notifications.notify).toHaveBeenCalledWith(expect.objectContaining({
      recipientId: 'artisan-1',
      relatedId: 'order-1',
      title: 'Nouvelle demande pour votre service',
    }));
  });
});
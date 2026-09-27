import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
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

  it('bloque la création d’une demande en mode démonstration avant de lire le service', async () => {
    const originalDemoMode = process.env.DEMO_MODE;
    process.env.DEMO_MODE = 'true';

    try {
      await expect(service.createOrder('client-1', requestData)).rejects.toBeInstanceOf(ForbiddenException);
      expect(services.findOne).not.toHaveBeenCalled();
    } finally {
      if (originalDemoMode === undefined) delete process.env.DEMO_MODE;
      else process.env.DEMO_MODE = originalDemoMode;
    }
  });

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

  it('renvoie une demande complétée dans la file de validation admin', async () => {
    const order = {
      id: 'order-1',
      clientId: 'client-1',
      status: 'details_requested',
      projectObjective: 'Ancienne description suffisamment longue pour dépasser cinquante caractères.',
      options: {},
      inspirationLinks: null,
      budgetMin: null,
      budgetMax: null,
      requestedDate: null,
      deliveryMethod: 'workshop',
      deliveryAddress: null,
      deliveryLatitude: null,
      deliveryLongitude: null,
      adminFeedback: 'Préciser les dimensions',
      service: { title: 'Confection sur mesure' },
    };
    orders.findOne.mockResolvedValue(order);
    orders.save.mockImplementation(async (value) => value);
    users.find.mockResolvedValue([{ id: 'admin-1' }]);

    const result = await service.resubmitDetails('client-1', 'order-1', {
      projectObjective: 'Nouvelle description suffisamment longue pour dépasser les cinquante caractères demandés.',
      deliveryMethod: 'workshop',
      budgetMin: 10000,
      budgetMax: 20000,
      options: { requestedFeatures: ['Tissu doublé'] },
    });

    expect(orders.findOne).toHaveBeenCalledWith({
      where: { id: 'order-1', clientId: 'client-1', status: 'details_requested' },
      relations: { service: true },
    });
    expect(result).toMatchObject({
      status: 'pending_admin_validation',
      projectObjective: 'Nouvelle description suffisamment longue pour dépasser les cinquante caractères demandés.',
      budgetMin: 10000,
      budgetMax: 20000,
      adminFeedback: null,
    });
    expect(notifications.notify).toHaveBeenCalledWith(expect.objectContaining({
      recipientId: 'admin-1',
      relatedId: 'order-1',
      title: 'Demande de service modifiée à revalider',
    }));
    expect(notifications.notify).toHaveBeenCalledWith(expect.objectContaining({
      recipientId: 'client-1',
      relatedId: 'order-1',
      title: 'Votre demande modifiée a été envoyée',
      link: '/service-orders/order-1',
    }));
  });

  it('refuse de republier une demande qui n’est pas en attente de précisions pour ce client', async () => {
    orders.findOne.mockResolvedValue(null);

    await expect(service.resubmitDetails('other-client', 'order-1', {
      projectObjective: 'Nouvelle description suffisamment longue pour dépasser les cinquante caractères demandés.',
      deliveryMethod: 'workshop',
    })).rejects.toBeInstanceOf(NotFoundException);
    expect(orders.save).not.toHaveBeenCalled();
  });
});
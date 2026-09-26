import { ForbiddenException } from '@nestjs/common';
import { ServiceOrdersController } from './service-orders.controller.js';

describe('ServiceOrdersController', () => {
  const serviceOrders = { createOrder: vi.fn() };
  const controller = new ServiceOrdersController(serviceOrders as never, {} as never);
  const requestData = {
    serviceId: 'service-1',
    projectObjective: 'Je souhaite une prestation réalisée pour mon projet personnel.',
    deliveryMethod: 'workshop' as const,
    clientConfirmed: true,
    termsAccepted: true,
  };

  beforeEach(() => vi.clearAllMocks());

  it.each(['artisan', 'institution'] as const)('refuse la création d’une commande de service au rôle %s', (role) => {
    expect(() => controller.createOrder({ id: `${role}-1`, role } as never, requestData)).toThrow(ForbiddenException);
    expect(serviceOrders.createOrder).not.toHaveBeenCalled();
  });

  it('autorise un client à commander un service', () => {
    serviceOrders.createOrder.mockReturnValue({ id: 'order-1' });

    expect(controller.createOrder({ id: 'client-1', role: 'client' } as never, requestData)).toEqual({ id: 'order-1' });
    expect(serviceOrders.createOrder).toHaveBeenCalledWith('client-1', requestData);
  });
});

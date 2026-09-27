import { ForbiddenException } from '@nestjs/common';
import { OrdersService } from './orders.service.js';

describe('OrdersService', () => {
  it('bloque la création d’une commande en mode démonstration avant la transaction', async () => {
    const originalDemoMode = process.env.DEMO_MODE;
    process.env.DEMO_MODE = 'true';
    const transaction = vi.fn();
    const service = new OrdersService({} as never, { transaction } as never, {} as never);

    try {
      await expect(service.placeOrder('buyer-1', 'listing-1', 1)).rejects.toBeInstanceOf(ForbiddenException);
      expect(transaction).not.toHaveBeenCalled();
    } finally {
      if (originalDemoMode === undefined) delete process.env.DEMO_MODE;
      else process.env.DEMO_MODE = originalDemoMode;
    }
  });
});
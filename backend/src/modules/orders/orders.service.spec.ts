import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { OrdersService } from './orders.service.js';

describe('OrdersService', () => {
  it('bloque la création d’une commande en mode démonstration avant la transaction', async () => {
    const originalDemoMode = process.env.DEMO_MODE;
    process.env.DEMO_MODE = 'true';
    const transaction = vi.fn();
    const service = new OrdersService({} as never, {} as never, { transaction } as never, {} as never);

    try {
      await expect(service.placeOrder('buyer-1', 'listing-1', 1)).rejects.toBeInstanceOf(ForbiddenException);
      expect(transaction).not.toHaveBeenCalled();
    } finally {
      if (originalDemoMode === undefined) delete process.env.DEMO_MODE;
      else process.env.DEMO_MODE = originalDemoMode;
    }
  });

  it('rejette un prix d’offre non entier avant tout accès aux données', async () => {
    const originalDemoMode = process.env.DEMO_MODE;
    process.env.DEMO_MODE = 'false';
    const getRepository = vi.fn();
    const service = new OrdersService({} as never, {} as never, { getRepository } as never, {} as never);

    try {
      await expect(service.createListingOffer('buyer-1', {
        listingId: 'listing-1',
        quantity: 1,
        offeredUnitPrice: 1000.5,
        paymentMethod: 'cash',
        deliveryMethod: 'workshop',
      })).rejects.toBeInstanceOf(BadRequestException);
      expect(getRepository).not.toHaveBeenCalled();
    } finally {
      if (originalDemoMode === undefined) delete process.env.DEMO_MODE;
      else process.env.DEMO_MODE = originalDemoMode;
    }
  });

  it('empêche une partie de proposer deux fois de suite', async () => {
    const offer = { id: 'offer-1', buyerId: 'buyer-1', sellerId: 'seller-1', status: 'pending', lastProposedBy: 'buyer', negotiationHistory: [] };
    const manager = { findOne: vi.fn().mockResolvedValue(offer), save: vi.fn() };
    const transaction = vi.fn((callback: (value: typeof manager) => unknown) => callback(manager));
    const service = new OrdersService({} as never, {} as never, { transaction } as never, {} as never);

    await expect(service.counterListingOffer('buyer-1', 'offer-1', { unitPrice: 9000 })).rejects.toBeInstanceOf(BadRequestException);
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('enregistre la contre-proposition et notifie l’autre partie', async () => {
    const offer = {
      id: 'offer-1', buyerId: 'buyer-1', sellerId: 'seller-1', status: 'pending', lastProposedBy: 'buyer',
      offeredUnitPrice: 8000, message: null, negotiationHistory: [{ proposedBy: 'buyer', unitPrice: 8000, message: null, createdAt: '2026-09-30T00:00:00.000Z' }],
    };
    const manager = { findOne: vi.fn().mockResolvedValue(offer), save: vi.fn(async (value) => value) };
    const transaction = vi.fn((callback: (value: typeof manager) => unknown) => callback(manager));
    const notify = vi.fn();
    const service = new OrdersService({} as never, {} as never, { transaction } as never, { notify } as never);

    const result = await service.counterListingOffer('seller-1', 'offer-1', { unitPrice: 9500, message: 'Prix ferme.' });

    expect(result.offeredUnitPrice).toBe(9500);
    expect(result.lastProposedBy).toBe('seller');
    expect(result.negotiationHistory).toHaveLength(2);
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ recipientId: 'buyer-1', relatedId: 'offer-1' }));
  });
});
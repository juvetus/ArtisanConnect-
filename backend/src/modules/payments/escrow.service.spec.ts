import { BadRequestException } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EscrowService } from './escrow.service.js';
import { Order } from '../../entities/index.js';

describe('EscrowService.disburse', () => {
  afterEach(() => vi.unstubAllEnvs());

  function createService(paymentStatus: string) {
    const order = {
      id: 'order-1',
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      buyerConfirmedReception: true,
      totalPrice: 10000,
    };
    const payment = { orderId: order.id, status: paymentStatus, method: 'momo' };
    const manager = {
      findOne: vi.fn().mockResolvedValue(payment),
      save: vi.fn(async (value) => value),
      update: vi.fn(),
    };
    const ordersRepository = { findOne: vi.fn().mockResolvedValue(order) };
    const dataSource = {
      transaction: vi.fn(async (callback: (transactionManager: typeof manager) => Promise<unknown>) => callback(manager)),
    };
    const shopsService = { recordSuccessfulSale: vi.fn() };
    const service = new EscrowService(
      ordersRepository as never,
      dataSource as never,
      shopsService as never,
      {} as never,
      { issueForOrder: vi.fn() } as never,
    );

    return { service, manager, shopsService };
  }

  it('records five percent only when a live platform payment is confirmed and released', async () => {
    vi.stubEnv('MOMO_MODE', 'live');
    vi.stubEnv('MOMO_TARGET_ENVIRONMENT', 'production');
    vi.stubEnv('MOMO_API_USER', 'api-user');
    vi.stubEnv('MOMO_API_KEY', 'api-key');
    vi.stubEnv('MOMO_SUBSCRIPTION_KEY', 'subscription-key');
    const { service, manager, shopsService } = createService('confirmed');

    await service.disburse('order-1', 'buyer-1');

    expect(manager.update).toHaveBeenCalledWith(Order, 'order-1', { status: 'completed', platformFee: 500 });
    expect(shopsService.recordSuccessfulSale).toHaveBeenCalledWith('seller-1');
  });

  it('does not release or calculate a fee for a pending payment', async () => {
    vi.stubEnv('MOMO_MODE', 'live');
    vi.stubEnv('MOMO_TARGET_ENVIRONMENT', 'production');
    vi.stubEnv('MOMO_API_USER', 'api-user');
    vi.stubEnv('MOMO_API_KEY', 'api-key');
    vi.stubEnv('MOMO_SUBSCRIPTION_KEY', 'subscription-key');
    const { service, manager, shopsService } = createService('pending');

    await expect(service.disburse('order-1', 'buyer-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(manager.update).not.toHaveBeenCalled();
    expect(shopsService.recordSuccessfulSale).not.toHaveBeenCalled();
  });

  it('issues the order invoice after a successful Orange Money callback', async () => {
    const payment = { orderId: 'order-1', status: 'pending', method: 'orange_money' };
    const manager = {
      findOne: vi.fn().mockResolvedValue(payment),
      save: vi.fn(async (value) => value),
      update: vi.fn(),
    };
    const dataSource = {
      transaction: vi.fn(async (callback: (transactionManager: typeof manager) => Promise<unknown>) => callback(manager)),
    };
    const invoicesService = { issueForOrder: vi.fn().mockResolvedValue({ id: 'invoice-1' }) };
    const service = new EscrowService(
      {} as never,
      dataSource as never,
      {} as never,
      { handleCallback: vi.fn().mockResolvedValue({ status: 'SUCCESS', transactionId: 'om-transaction-1' }) } as never,
      invoicesService as never,
    );

    const result = await service.handleOrangeCallback({ order_id: 'order-1' });

    expect(result).toMatchObject({ success: true, orderId: 'order-1', status: 'SUCCESS' });
    expect(invoicesService.issueForOrder).toHaveBeenCalledWith('order-1');
  });
});
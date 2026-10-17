import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { EscrowService } from './escrow.service.js';

describe('EscrowService Iwomipay callbacks', () => {
  it('confirms a payment only after rechecking its status with Iwomipay', async () => {
    const payment = {
      orderId: 'order-1',
      status: 'pending',
      iwomipayExternalId: 'external-1',
      iwomipayInternalId: 'internal-1',
      iwomipayRedirectUrl: null,
    };
    const paymentRepository = {
      findOne: vi.fn().mockResolvedValue(payment),
      save: vi.fn(async (entity) => entity),
    };
    const manager = {
      findOne: vi.fn().mockResolvedValue(payment),
      save: vi.fn(async (entity) => entity),
      update: vi.fn(),
    };
    const dataSource = {
      getRepository: vi.fn().mockReturnValue(paymentRepository),
      transaction: vi.fn(async (callback: (transactionManager: typeof manager) => Promise<unknown>) => callback(manager)),
    };
    const iwomipayService = {
      checkTransactionStatus: vi.fn().mockResolvedValue({
        externalId: 'external-1',
        internalId: 'internal-1',
        status: 'SUCCESS',
      }),
    };
    const invoicesService = { issueForOrder: vi.fn().mockResolvedValue({ id: 'invoice-1' }) };
    const service = new EscrowService(
      {} as never,
      dataSource as never,
      {} as never,
      {} as never,
      iwomipayService as never,
      invoicesService as never,
    );

    const result = await service.handleIwomipayCallback({
      external_id: 'external-1',
      internal_id: 'internal-1',
      status: '100',
    });

    expect(iwomipayService.checkTransactionStatus).toHaveBeenCalledWith('internal-1', 'external-1');
    expect(payment.status).toBe('confirmed');
    expect(manager.update).toHaveBeenCalledWith(expect.anything(), 'order-1', { status: 'confirmed' });
    expect(invoicesService.issueForOrder).toHaveBeenCalledWith('order-1');
    expect(result).toMatchObject({ success: true, status: 'SUCCESS', paymentStatus: 'confirmed' });
  });

  it('rejects callbacks whose internal reference does not match the stored transaction', async () => {
    const paymentRepository = {
      findOne: vi.fn().mockResolvedValue({
        orderId: 'order-1',
        iwomipayExternalId: 'external-1',
        iwomipayInternalId: 'internal-1',
      }),
    };
    const iwomipayService = { checkTransactionStatus: vi.fn() };
    const service = new EscrowService(
      {} as never,
      { getRepository: vi.fn().mockReturnValue(paymentRepository) } as never,
      {} as never,
      {} as never,
      iwomipayService as never,
      {} as never,
    );

    await expect(service.handleIwomipayCallback({
      external_id: 'external-1',
      internal_id: 'forged-internal-id',
      status: '01',
    })).rejects.toBeInstanceOf(NotFoundException);
    expect(iwomipayService.checkTransactionStatus).not.toHaveBeenCalled();
  });
});

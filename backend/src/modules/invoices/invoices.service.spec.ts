import { afterEach, describe, expect, it, vi } from 'vitest';
import { InvoicesService } from './invoices.service.js';

describe('InvoicesService.issueForOrder', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('issues a client invoice for the paid sale total without adding the artisan commission', async () => {
    const invoice = {
      id: 'invoice-1',
      invoiceNumber: 'FAC-2026-ORDER1234',
      total: 10000,
      currency: 'XAF',
    };
    const invoiceRepository = {
      findOne: vi.fn().mockResolvedValue(null),
      create: vi.fn((value) => value),
      save: vi.fn().mockResolvedValue(invoice),
    };
    const ordersRepository = {
      findOne: vi.fn().mockResolvedValue({
        id: 'order-1234',
        buyerId: 'buyer-1',
        sellerId: 'seller-1',
        totalPrice: 10000,
        platformFee: 500,
        buyer: { email: 'buyer@example.cm', name: 'Client' },
        seller: { name: 'Artisan' },
        listing: { title: 'Panier tressé' },
      }),
    };
    const paymentsRepository = { findOne: vi.fn().mockResolvedValue({ status: 'confirmed' }) };
    const email = { send: vi.fn().mockResolvedValue(undefined) };
    const pdf = { invoice: vi.fn().mockReturnValue(Buffer.from('pdf')) };
    const config = { get: vi.fn((_key: string, fallback: number) => fallback) };
    const service = new InvoicesService(
      invoiceRepository as never,
      ordersRepository as never,
      paymentsRepository as never,
      {} as never,
      email as never,
      pdf as never,
      config as never,
    );

    await service.issueForOrder('order-1234');

    expect(invoiceRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      orderId: 'order-1234',
      subtotal: 10000,
      taxAmount: 0,
      total: 10000,
    }));
    expect(invoiceRepository.create.mock.calls[0][0]).not.toHaveProperty('platformFee');
    expect(email.send).toHaveBeenCalledOnce();
  });

  it('does not issue an invoice before the payment is confirmed', async () => {
    const invoiceRepository = { findOne: vi.fn(), create: vi.fn(), save: vi.fn() };
    const paymentsRepository = { findOne: vi.fn().mockResolvedValue({ status: 'pending' }) };
    const service = new InvoicesService(
      invoiceRepository as never,
      {} as never,
      paymentsRepository as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(service.issueForOrder('order-1')).resolves.toBeNull();
    expect(invoiceRepository.save).not.toHaveBeenCalled();
  });
});
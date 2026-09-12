import { describe, it, expect, beforeEach } from 'vitest';
import { OrangeMoneyService } from './orange-money.service.js';
import { ConfigService } from '@nestjs/config';

describe('OrangeMoneyService', () => {
  let service: OrangeMoneyService;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(() => {
    mockConfigService = {
      get: (key: string) => {
        if (key === 'ORANGE_MONEY_MODE') return 'mock';
        if (key === 'FRONTEND_URL') return 'http://localhost:3000';
        return undefined;
      },
    };
    service = new OrangeMoneyService(mockConfigService as ConfigService);
  });

  it('doit initialiser un paiement Web Payment simulé avec succès', async () => {
    const result = await service.initWebPayment({
      orderId: 'order-uuid-456',
      amount: 15000,
      currency: 'XAF',
    });

    expect(result).toBeDefined();
    expect(result.status).toBe('PENDING');
    expect(result.paymentUrl).toContain('orderId=order-uuid-456');
    expect(result.transactionId).toMatch(/^OM-TX-/);
    expect(result.paymentToken).toMatch(/^TOKEN-/);
  });

  it('doit vérifier le statut d’une transaction', async () => {
    const status = await service.checkTransactionStatus('order-uuid-456', 15000, 'OM-TX-TEST');
    expect(status.status).toBe('SUCCESS');
    expect(status.amount).toBe(15000);
    expect(status.currency).toBe('XAF');
  });

  it('doit exécuter un reversement vers l’artisan (disbursement)', async () => {
    const disburse = await service.disburseToArtisan({
      artisanPhone: '+237699001122',
      amount: 13500, // 90%
      reference: 'CMD-REF-456',
      orderId: 'order-uuid-456',
    });

    expect(disburse.status).toBe('SUCCESS');
    expect(disburse.amount).toBe(13500);
    expect(disburse.recipient).toBe('+237699001122');
    expect(disburse.disbursementId).toMatch(/^OM-PAYOUT-/);
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { calculateCollectedPlatformCommission } from './platform-commission.js';

describe('calculateCollectedPlatformCommission', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('does not charge direct cash payments', () => {
    vi.stubEnv('ORANGE_MONEY_MODE', 'live');
    vi.stubEnv('ORANGE_MONEY_CLIENT_ID', 'client-id');
    vi.stubEnv('ORANGE_MONEY_CLIENT_SECRET', 'client-secret');
    vi.stubEnv('ORANGE_MONEY_MERCHANT_KEY', 'merchant-key');

    expect(calculateCollectedPlatformCommission(10000, 'cash')).toBe(0);
  });

  it('does not count simulated or sandbox payments as collected', () => {
    vi.stubEnv('MOMO_MODE', 'sandbox');
    vi.stubEnv('MOMO_TARGET_ENVIRONMENT', 'sandbox');
    vi.stubEnv('MOMO_API_USER', 'api-user');
    vi.stubEnv('MOMO_API_KEY', 'api-key');
    vi.stubEnv('MOMO_SUBSCRIPTION_KEY', 'subscription-key');
    vi.stubEnv('ORANGE_MONEY_MODE', 'mock');
    vi.stubEnv('ORANGE_MONEY_CLIENT_ID', 'client-id');
    vi.stubEnv('ORANGE_MONEY_CLIENT_SECRET', 'client-secret');
    vi.stubEnv('ORANGE_MONEY_MERCHANT_KEY', 'merchant-key');

    expect(calculateCollectedPlatformCommission(10000, 'momo')).toBe(0);
    expect(calculateCollectedPlatformCommission(10000, 'orange_money')).toBe(0);
  });

  it('calculates five percent only for live configured platform payments', () => {
    vi.stubEnv('MOMO_MODE', 'live');
    vi.stubEnv('MOMO_TARGET_ENVIRONMENT', 'production');
    vi.stubEnv('MOMO_API_USER', 'api-user');
    vi.stubEnv('MOMO_API_KEY', 'api-key');
    vi.stubEnv('MOMO_SUBSCRIPTION_KEY', 'subscription-key');

    expect(calculateCollectedPlatformCommission(10001, 'momo')).toBe(500);
    expect(calculateCollectedPlatformCommission(10000, 'cash')).toBe(0);
  });

  it('calculates Orange Money commissions only with real credentials and live mode', () => {
    vi.stubEnv('ORANGE_MONEY_MODE', 'live');
    vi.stubEnv('ORANGE_MONEY_CLIENT_ID', 'client-id');
    vi.stubEnv('ORANGE_MONEY_CLIENT_SECRET', 'client-secret');
    vi.stubEnv('ORANGE_MONEY_MERCHANT_KEY', 'merchant-key');

    expect(calculateCollectedPlatformCommission(10000, 'orange_money')).toBe(500);

    vi.stubEnv('ORANGE_MONEY_CLIENT_ID', '...');
    expect(calculateCollectedPlatformCommission(10000, 'orange_money')).toBe(0);
  });

  it('returns zero for invalid or non-positive amounts', () => {
    vi.stubEnv('ORANGE_MONEY_MODE', 'live');
    vi.stubEnv('ORANGE_MONEY_CLIENT_ID', 'client-id');
    vi.stubEnv('ORANGE_MONEY_CLIENT_SECRET', 'client-secret');
    vi.stubEnv('ORANGE_MONEY_MERCHANT_KEY', 'merchant-key');

    expect(calculateCollectedPlatformCommission(Number.NaN, 'orange_money')).toBe(0);
    expect(calculateCollectedPlatformCommission(0, 'orange_money')).toBe(0);
  });
});
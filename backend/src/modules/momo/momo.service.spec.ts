import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { MomoService } from './momo.service.js';

describe('MomoService', () => {
  it('returns a mock token when no MoMo credentials are configured', async () => {
    const service = new MomoService(new ConfigService({}));

    await expect(service.getAccessToken()).resolves.toBe('mock-momo-token');
  });

  it('reports sandbox readiness without exposing credentials', () => {
    const service = new MomoService(new ConfigService({
      MOMO_MODE: 'sandbox',
      MOMO_API_USER: 'api-user',
      MOMO_API_KEY: 'api-key',
      MOMO_SUBSCRIPTION_KEY: 'subscription-key',
      API_URL: 'https://api.example.com',
    }));

    expect(service.getConfigurationStatus()).toEqual({
      mode: 'sandbox',
      configured: true,
      targetEnvironment: 'sandbox',
      baseUrl: 'https://sandbox.momodeveloper.mtn.com',
      callbackUrl: 'https://api.example.com/momo/webhook',
      missing: [],
    });
  });

  it('accepts a valid webhook HMAC signature', () => {
    const service = new MomoService(new ConfigService({ MOMO_WEBHOOK_SECRET: 'test-secret' }));
    const rawBody = Buffer.from(JSON.stringify({ externalId: 'SUB-1', status: 'SUCCESSFUL' }));
    const signature = createHmac('sha256', 'test-secret').update(rawBody).digest('hex');

    expect(() => service.verifyWebhookSignature({ 'x-momo-signature': `sha256=${signature}` }, rawBody)).not.toThrow();
  });

  it('rejects an invalid webhook HMAC signature', () => {
    const service = new MomoService(new ConfigService({ MOMO_WEBHOOK_SECRET: 'test-secret' }));
    const rawBody = Buffer.from(JSON.stringify({ externalId: 'SUB-1', status: 'SUCCESSFUL' }));

    expect(() => service.verifyWebhookSignature({ 'x-momo-signature': 'sha256=bad-signature' }, rawBody)).toThrow();
  });
});

import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { MomoService } from './momo.service.js';

describe('MomoService', () => {
  it('returns a mock token when no MoMo credentials are configured', async () => {
    const service = new MomoService(new ConfigService({}));

    await expect(service.getAccessToken()).resolves.toBe('mock-momo-token');
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

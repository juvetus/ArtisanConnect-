import { BadGatewayException, BadRequestException } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { IwomipayService } from './iwomipay.service.js';
import { ConfigService } from '@nestjs/config';

function createService(values: Record<string, string> = {}) {
  const config = {
    get: (key: string) => values[key],
  } as ConfigService;
  return new IwomipayService(config);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('IwomipayService', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uses a mock by default without making external calls', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const service = createService();

    const result = await service.initiatePayment({
      amount: 5000,
      externalId: 'order123',
      method: 'orange_money',
      payerPhone: '+237 699 000 000',
      motif: 'ArtisanConnect order order123',
    });

    expect(result.status).toBe('PENDING');
    expect(result.internalId).toContain('IWOMI-MOCK-');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('authenticates once, sends the documented collection request, and checks status', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ status: '01', token: 'sandbox-token' }))
      .mockResolvedValueOnce(jsonResponse({
        status: '1000',
        external_id: 'order123',
        internal_id: 'internal-123',
        redirectUrl: 'https://sandbox.example/pay',
      }))
      .mockResolvedValueOnce(jsonResponse({
        status: '01',
        external_id: 'order123',
        internal_id: 'internal-123',
      }));
    vi.stubGlobal('fetch', fetchMock);
    const service = createService({
      IWOMIPAY_MODE: 'sandbox',
      IWOMIPAY_USERNAME: 'sandbox-user',
      IWOMIPAY_PASSWORD: 'sandbox-password',
      IWOMIPAY_API_KEY: 'account-key',
      IWOMIPAY_API_SECRET: 'account-secret',
      API_URL: 'https://api.example/',
    });

    const input = {
      amount: 5000,
      externalId: 'order123',
      method: 'orange_money' as const,
      payerPhone: '+237 699 000 000',
      motif: 'ArtisanConnect order order123',
    };
    const payment = await service.initiatePayment(input);
    const status = await service.checkTransactionStatus('internal-123', 'order123');

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][0]).toBe('https://www.pay.iwomitechnologies.com/api/iwomipay_sandbox/authenticate');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST' });
    expect(fetchMock.mock.calls[1][0]).toBe('https://www.pay.iwomitechnologies.com/api/iwomipay_sandbox/iwomipay');
    const request = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(request).toMatchObject({
      country: 'CM',
      amount: '5000',
      tel: '237699000000',
      op_type: 'debit',
      type: 'om',
      external_id: 'order123',
      callback_url: 'https://api.example/payments/iwomipay/callback',
    });
    expect(fetchMock.mock.calls[1][1].headers).toMatchObject({
      accountKey: Buffer.from('account-key:account-secret').toString('base64'),
      authorization: 'Bearer sandbox-token',
    });
    expect(payment).toMatchObject({ status: 'PENDING', internalId: 'internal-123', redirectUrl: 'https://sandbox.example/pay' });
    expect(status.status).toBe('SUCCESS');
    expect(fetchMock.mock.calls[2][0]).toBe('https://www.pay.iwomitechnologies.com/api/iwomipay_sandbox/iwomipayStatus/internal-123');
  });

  it('maps MoMo, Orange Money and cards to the documented Iwomipay types', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ status: '01', token: 'sandbox-token' }))
      .mockResolvedValueOnce(jsonResponse({ status: '1000', external_id: 'momo123', internal_id: 'internal-momo' }))
      .mockResolvedValueOnce(jsonResponse({ status: '1000', external_id: 'orange123', internal_id: 'internal-orange' }))
      .mockResolvedValueOnce(jsonResponse({ status: '1000', external_id: 'card123', internal_id: 'internal-card' }));
    vi.stubGlobal('fetch', fetchMock);
    const service = createService({
      IWOMIPAY_MODE: 'sandbox',
      IWOMIPAY_USERNAME: 'sandbox-user',
      IWOMIPAY_PASSWORD: 'sandbox-password',
      IWOMIPAY_API_KEY: 'account-key',
      IWOMIPAY_API_SECRET: 'account-secret',
    });
    const common = { amount: 5000, payerPhone: '237699000000', motif: 'ArtisanConnect order' };

    await service.initiatePayment({ ...common, externalId: 'momo123', method: 'momo' });
    await service.initiatePayment({ ...common, externalId: 'orange123', method: 'orange_money' });
    await service.initiatePayment({
      ...common,
      externalId: 'card123',
      method: 'card',
      cardDetails: {
        firstName: 'Awa',
        lastName: 'Nana',
        email: 'awa@example.cm',
        address: 'Rue 1, Bonanjo',
        city: 'Douala',
      },
    });

    const requests = fetchMock.mock.calls.slice(1).map((call) => JSON.parse(call[1].body));
    expect(requests.map((request) => request.type)).toEqual(['momo', 'om', 'card']);
    expect(requests[2]).toMatchObject({
      email: 'awa@example.cm',
      first_name: 'Awa',
      last_name: 'Nana',
      address: 'Rue 1, Bonanjo',
      city: 'Douala',
    });
  });

  it('rejects amounts below the provider minimum and invalid payer numbers', async () => {
    const service = createService();
    const base = {
      amount: 99,
      externalId: 'order123',
      payerPhone: '123',
      motif: 'Order',
    };

    await expect(service.initiatePayment({ ...base, method: 'orange_money' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.initiatePayment({ ...base, amount: 100, method: 'orange_money' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects unexpected provider statuses and mismatched transaction references', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ status: '01', token: 'sandbox-token' }))
      .mockResolvedValueOnce(jsonResponse({ status: '999', internal_id: 'internal-123' }));
    vi.stubGlobal('fetch', fetchMock);
    const service = createService({
      IWOMIPAY_MODE: 'sandbox',
      IWOMIPAY_USERNAME: 'sandbox-user',
      IWOMIPAY_PASSWORD: 'sandbox-password',
      IWOMIPAY_API_KEY: 'account-key',
      IWOMIPAY_API_SECRET: 'account-secret',
    });

    await expect(service.initiatePayment({
      amount: 5000,
      externalId: 'order123',
      method: 'orange_money',
      payerPhone: '237699000000',
      motif: 'Order',
    })).rejects.toBeInstanceOf(BadGatewayException);

    const statusFetch = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ status: '01', token: 'sandbox-token' }))
      .mockResolvedValueOnce(jsonResponse({ status: '01', external_id: 'wrong-id', internal_id: 'internal-123' }));
    vi.stubGlobal('fetch', statusFetch);
    await expect(service.checkTransactionStatus('internal-123', 'order123')).rejects.toBeInstanceOf(BadGatewayException);
  });
});

import { ServiceUnavailableException } from '@nestjs/common';
import { SmsService } from './sms.service.js';

describe('SmsService', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('envoie un OTP via Brevo avec le numéro international', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201 });
    globalThis.fetch = fetchMock as typeof fetch;
    const service = new SmsService({ get: vi.fn((key: string) => ({ BREVO_API_KEY: 'key', BREVO_SMS_SENDER: 'ArtisanConnect' })[key]) } as never);

    await expect(service.sendOtp('+33612345678', '123456')).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('https://api.brevo.com/v3/transactionalSMS/sms', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ 'api-key': 'key' }),
      body: expect.stringContaining('33612345678'),
    }));
  });

  it('refuse l’envoi quand les identifiants Brevo sont absents', async () => {
    const service = new SmsService({ get: vi.fn().mockReturnValue(undefined) } as never);

    await expect(service.sendOtp('+33612345678', '123456')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

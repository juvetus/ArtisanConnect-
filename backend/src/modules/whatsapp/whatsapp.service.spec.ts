import { WhatsAppService } from './whatsapp.service.js';

describe('WhatsAppService', () => {
  const configValues: Record<string, string> = {
    WHATSAPP_ACCESS_TOKEN: 'test-token',
    WHATSAPP_PHONE_NUMBER_ID: 'phone-number-id',
    WHATSAPP_SERVICE_REQUEST_TEMPLATE: 'new_service_request',
  };
  const config = {
    get: vi.fn((key: string, fallback?: string) => configValues[key] ?? fallback),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('conserve l’indicatif international français pour l’alerte admin', async () => {
    const service = new WhatsAppService(config as never);

    await service.sendAdminNoMatch('Aucune correspondance', 'https://artisanconnect.cm/admin');

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/phone-number-id/messages'), expect.objectContaining({
      body: expect.stringContaining('"to":"33782510546"'),
    }));
  });
});
import { WhatsAppService } from './whatsapp.service.js';

describe('WhatsAppService', () => {
  const configValues: Record<string, string> = {
    WHATSAPP_ACCESS_TOKEN: 'test-token',
    WHATSAPP_PHONE_NUMBER_ID: 'phone-number-id',
    WHATSAPP_NOTIFICATION_TEMPLATE: 'generic_notification',
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

  it('conserve l’indicatif international français du numéro admin de fallback', async () => {
    const service = new WhatsAppService(config as never);

    await service.sendNotification(undefined, 'Administration', 'Aucune correspondance', 'Aucun artisan trouvé.', 'https://artisanconnect.cm/admin', true);

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/phone-number-id/messages'), expect.objectContaining({
      body: expect.stringContaining('"to":"33782510546"'),
    }));
  });

  it('envoie une notification à un numéro international avec le modèle générique configuré', async () => {
    const service = new WhatsAppService(config as never);

    await service.sendNotification('+237699000001', 'Awa', 'Nouvelle commande', 'Une commande vous attend.', 'https://artisanconnect.cm/dashboard');

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/phone-number-id/messages'), expect.objectContaining({
      body: expect.stringContaining('"name":"generic_notification"'),
    }));
  });
});
import { BadRequestException } from '@nestjs/common';
import { AssistantService } from './assistant.service.js';

describe('AssistantService profile and photo analysis', () => {
  const configValues: Record<string, string> = {
    AI_API_KEY: 'test-key',
    AI_BASE_URL: 'https://ai.example.test/v1',
    AI_MODEL: 'vision-model',
  };
  const config = { get: vi.fn((key: string) => configValues[key]) };
  const storage = { isEnabled: vi.fn(), uploadBuffer: vi.fn() };
  const subscriptions = { getAiImageQuota: vi.fn() };
  const generations = { create: vi.fn(), save: vi.fn() };
  let service: AssistantService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AssistantService(config as never, storage as never, subscriptions as never, generations as never);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('uses the complete profile pack instructions in the existing text assistant', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '1. Description\n2. Services\n3. Prix\n4. WhatsApp\n5. Réseaux' } }] }),
    }));

    const result = await service.generate({ task: 'profil', input: 'Menuisière, Douala, meubles sur mesure.', language: 'fr' });

    expect(result.provider).toBe('ai');
    expect(result.content).toContain('Description');
    const [, init] = vi.mocked(fetch).mock.calls[0];
    const payload = JSON.parse(String(init?.body));
    expect(payload.messages[0].content).toContain('150 mots maximum');
    expect(payload.messages[0].content).toContain('WhatsApp');
  });

  it('uses safe instructions for client request clarification and artisan reply drafts', async () => {
    const requests: string[] = [];
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
      const payload = JSON.parse(String(init.body));
      requests.push(payload.messages[0].content);
      return { ok: true, json: async () => ({ choices: [{ message: { content: 'Brouillon à relire.' } }] }) };
    }));

    await service.generate({ task: 'demande_client', input: 'Je cherche une table.', context: 'Ville : Douala' });
    await service.generate({ task: 'reponse_opportunite', input: 'Le client cherche une table.', context: 'Budget : non précisé' });

    expect(requests[0]).toContain('N’invente ni dimensions, ni matériaux, ni budget, ni délai');
    expect(requests[1]).toContain('N’invente aucun prix');
    expect(requests[1]).toContain('Ne prétends pas avoir déjà envoyé le message');
  });

  it('analyzes photo quality without claiming image ownership can be proven', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify({
        probableTrade: 'Menuiserie',
        qualityScore: 82,
        issues: ['Lumière faible'],
        recommendations: ['Photographier près d’une fenêtre'],
        tradeCoherence: 'coherent',
        authenticityAssessment: 'verified',
        optimizedCaption: 'Table en bois massif réalisée sur mesure.',
        limitations: 'Une image ne permet pas de vérifier sa provenance.',
      }) } }] }),
    }));

    const result = await service.analyzeArtisanPhoto({
      buffer: Buffer.from('fake image bytes'),
      mimetype: 'image/jpeg',
      originalname: 'table.jpg',
    } as Express.Multer.File, 'Menuisière', 'fr');

    expect(result.probableTrade).toBe('Menuiserie');
    expect(result.qualityScore).toBe(82);
    expect(result.authenticityAssessment).toBe('not_verifiable_from_image_alone');
    const [, init] = vi.mocked(fetch).mock.calls[0];
    const payload = JSON.parse(String(init?.body));
    expect(payload.messages[0].content).toContain('Never claim the image is stolen');
  expect(payload.messages[1].content[0].text).toContain('Menuisière');
  });

  it('rejects a photo-analysis response that is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'not json' } }] }),
    }));

    await expect(service.analyzeArtisanPhoto({
      buffer: Buffer.from('fake image bytes'),
      mimetype: 'image/png',
      originalname: 'work.png',
    } as Express.Multer.File, 'Couture')).rejects.toBeInstanceOf(BadRequestException);
  });
});

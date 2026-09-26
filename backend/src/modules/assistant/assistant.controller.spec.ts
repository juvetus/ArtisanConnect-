import { BadRequestException } from '@nestjs/common';
import { AssistantController } from './assistant.controller.js';

describe('AssistantController role-scoped text suggestions', () => {
  const assistant = { generate: vi.fn().mockResolvedValue({ content: 'Suggestion', provider: 'ai' }) };
  const controller = new AssistantController(assistant as never);

  beforeEach(() => vi.clearAllMocks());

  it('allows artisans to request listing and service descriptions', async () => {
    const artisan = { id: 'artisan-1', role: 'artisan' } as never;

    await controller.suggestText(artisan, { task: 'listing_description', input: 'Vase en terre cuite', language: 'fr' });
    await controller.suggestText(artisan, { task: 'service_description', input: 'Réparation de meubles', language: 'fr' });

    expect(assistant.generate).toHaveBeenNthCalledWith(1, expect.objectContaining({ task: 'listing_description' }));
    expect(assistant.generate).toHaveBeenNthCalledWith(2, expect.objectContaining({ task: 'service_description' }));
  });

  it('allows institutions to request resource and program descriptions', async () => {
    const institution = { id: 'institution-1', role: 'institution' } as never;

    await controller.suggestText(institution, { task: 'institution_resource', input: 'Guide de gestion', language: 'fr' });
    await controller.suggestText(institution, { task: 'institution_program', input: 'Formation métiers artisanaux', language: 'fr' });

    expect(assistant.generate).toHaveBeenNthCalledWith(1, expect.objectContaining({ task: 'institution_resource' }));
    expect(assistant.generate).toHaveBeenNthCalledWith(2, expect.objectContaining({ task: 'institution_program' }));
  });

  it('denies tasks outside the role allowlist', () => {
    expect(() => controller.suggestText(
      { id: 'client-1', role: 'client' } as never,
      { task: 'institution_program', input: 'Programme' },
    )).toThrow(BadRequestException);
    expect(() => controller.suggestText(
      { id: 'artisan-1', role: 'artisan' } as never,
      { task: 'institution_program', input: 'Programme' },
    )).toThrow(BadRequestException);
    expect(assistant.generate).not.toHaveBeenCalled();
  });
});

import { ForbiddenException } from '@nestjs/common';
import { CustomerRequestsController } from './customer-requests.controller.js';

describe('CustomerRequestsController', () => {
  const service = { create: vi.fn() };
  const controller = new CustomerRequestsController(service as never);

  beforeEach(() => vi.clearAllMocks());

  it('refuse à un artisan de publier une demande destinée à trouver un artisan', () => {
    expect(() => controller.create(
      { id: 'artisan-1', role: 'artisan' } as never,
      { category: 'menuiserie', city: 'Douala', description: 'Je cherche un artisan pour une table sur mesure.' },
    )).toThrow(ForbiddenException);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('autorise un client à publier une demande', () => {
    service.create.mockReturnValue({ id: 'request-1' });
    const body = { category: 'menuiserie', city: 'Douala', description: 'Je cherche un artisan pour une table sur mesure.' };

    expect(controller.create({ id: 'client-1', role: 'client' } as never, body)).toEqual({ id: 'request-1' });
    expect(service.create).toHaveBeenCalledWith('client-1', body);
  });
});

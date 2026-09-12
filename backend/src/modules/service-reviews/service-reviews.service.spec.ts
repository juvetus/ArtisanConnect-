import { BadRequestException, ConflictException } from '@nestjs/common';
import { ServiceReviewsService } from './service-reviews.service.js';

function createService() {
  const reviews = {
    findOne: vi.fn(),
    create: vi.fn((data) => data),
    save: vi.fn(async (data) => ({ id: 'review-id', ...data })),
    findAndCount: vi.fn(),
    createQueryBuilder: vi.fn(),
  };
  const orders = {
    findOne: vi.fn(),
  };
  return { service: new ServiceReviewsService(reviews as never, orders as never), reviews, orders };
}

describe('ServiceReviewsService', () => {
  it('refuse un avis avant la fin de la commande', async () => {
    const { service, orders } = createService();
    orders.findOne.mockResolvedValue({
      id: 'order-id',
      clientId: 'client-id',
      artisanId: 'artisan-id',
      serviceId: 'service-id',
      status: 'delivered',
    });

    await expect(service.create('client-id', {
      orderId: 'order-id',
      rating: 5,
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('exige un commentaire pour une note faible', async () => {
    const { service, orders } = createService();
    orders.findOne.mockResolvedValue({
      id: 'order-id',
      clientId: 'client-id',
      artisanId: 'artisan-id',
      serviceId: 'service-id',
      status: 'completed',
    });

    await expect(service.create('client-id', {
      orderId: 'order-id',
      rating: 2,
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('autorise un avis vérifié après completed et empêche le doublon', async () => {
    const { service, orders, reviews } = createService();
    orders.findOne.mockResolvedValue({
      id: 'order-id',
      clientId: 'client-id',
      artisanId: 'artisan-id',
      serviceId: 'service-id',
      status: 'completed',
    });
    reviews.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'existing' });

    const created = await service.create('client-id', {
      orderId: 'order-id',
      rating: 5,
    });

    expect(created.verified).toBe(true);
    expect(created.recipientId).toBe('artisan-id');
    await expect(service.create('client-id', {
      orderId: 'order-id',
      rating: 5,
    })).rejects.toBeInstanceOf(ConflictException);
  });
});

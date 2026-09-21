import { describe, it, expect, vi } from 'vitest';
import { DataSource, Repository } from 'typeorm';
import { SubscriptionsService } from './subscriptions.service.js';
import { Subscription, SubscriptionPlan } from '../../entities/index.js';

function makePlan(overrides: Partial<SubscriptionPlan> = {}) {
  return { id: 'plan-1', name: 'Starter', slug: 'starter', price: 0, currency: 'XAF', durationDays: 30, isActive: true, description: 'Plan de démarrage', features: ['Profil', '5 annonces'], sortOrder: 1, ...overrides } as SubscriptionPlan;
}

describe('SubscriptionsService', () => {
  it('crée les plans par défaut avec le bon ordre et les bons slugs', async () => {
    const subscriptionRepository = {
      find: vi.fn(),
      findOne: vi.fn(),
      save: vi.fn(),
      create: vi.fn(),
    } as unknown as Repository<Subscription>;

    const savedPlans: SubscriptionPlan[] = [];
    const planRepository = {
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn().mockResolvedValue(null),
      save: vi.fn(async (plan: SubscriptionPlan) => {
        savedPlans.push(plan);
        return plan;
      }),
      create: vi.fn((plan) => plan),
    } as unknown as Repository<SubscriptionPlan>;

    const service = new SubscriptionsService(
      subscriptionRepository,
      planRepository,
      {} as DataSource,
      { initiateCollectionPayment: vi.fn(), getWebhookUrl: vi.fn() } as any,
    );

    const plans = await service.createDefaultPlans();

    expect(plans.map((plan) => plan.slug)).toEqual(['starter', 'visibilite-7', 'local-plus', 'croissance', 'premium-growth']);
    expect(plans.map((plan) => Number(plan.price))).toEqual([0, 1000, 3000, 5000, 10000]);
    expect(savedPlans).toHaveLength(5);
  });

  it('applique une politique de mise en avant selon le plan actif', async () => {
    const subscriptionRepository = {
      find: vi.fn().mockResolvedValue([
        { userId: 'artisan-1', status: 'active', endDate: new Date(Date.now() + 86400000), createdAt: new Date(), plan: { slug: 'local-plus' } },
      ]),
    } as unknown as Repository<Subscription>;
    const planRepository = {} as Repository<SubscriptionPlan>;
    const service = new SubscriptionsService(
      subscriptionRepository,
      planRepository,
      {} as DataSource,
      {} as any,
    );

    await expect(service.getSponsoringPolicy('artisan-1')).resolves.toEqual({ maxSponsored: 2, durationDays: 7 });

    subscriptionRepository.find = vi.fn().mockResolvedValue([
      { userId: 'artisan-1', status: 'active', endDate: new Date(Date.now() + 86400000), createdAt: new Date(), plan: { slug: 'premium-growth' } },
    ]) as typeof subscriptionRepository.find;

    await expect(service.getSponsoringPolicy('artisan-1')).resolves.toEqual({ maxSponsored: 5, durationDays: 30 });
  });
});

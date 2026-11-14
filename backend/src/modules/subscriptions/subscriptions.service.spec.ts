import { describe, it, expect, vi } from 'vitest';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service.js';
import { PromotionCode, PromotionRedemption, Subscription, SubscriptionPlan, User } from '../../entities/index.js';
import { MomoService } from '../momo/momo.service.js';

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

    expect(plans.map((plan) => plan.slug)).toEqual(['starter', 'local-plus', 'premium-growth', 'visibilite-7']);
    expect(plans.map((plan) => Number(plan.price))).toEqual([0, 3000, 10000, 1000]);
    expect(plans.map((plan) => plan.name)).toEqual(['Gratuit', 'Pro', 'Premium', 'Boost']);
    expect(savedPlans).toHaveLength(4);
  });

  function pilotFixture(overrides: Partial<PromotionCode> = {}, active = false) {
    const plan = makePlan({ price: 10000, slug: 'premium-growth' });
    const promo = { id: 'promo-1', code: 'PILOTE2026', active: true, discountPercent: 20, usedCount: 0, maxUses: 10, expiresAt: null, allowedPlanSlugs: null, ...overrides };
    const manager = {
      findOne: vi.fn(async (entity: unknown) => {
        if (entity === SubscriptionPlan) return plan;
        if (entity === User) return { id: 'artisan-1' };
        if (entity === Subscription) return active ? { endDate: new Date(Date.now() + 86400000) } : null;
        if (entity === PromotionCode) return promo.active ? promo : null;
        return null;
      }),
      create: vi.fn((_entity: unknown, data: object) => ({ id: 'sub-1', ...data })),
      save: vi.fn(async (data: object) => data),
    };
    const dataSource = {
      transaction: vi.fn(async (callback: (manager: EntityManager) => unknown) => callback(manager as unknown as EntityManager)),
    } as unknown as DataSource;
    const momo = { initiateCollectionPayment: vi.fn().mockResolvedValue({ status: 'SUCCESS' }), getPaymentStatus: vi.fn(), getWebhookUrl: vi.fn(), handleWebhook: vi.fn() };
    const repository = { findOne: vi.fn(), find: vi.fn(), save: vi.fn() };
    const service = new SubscriptionsService(repository as unknown as Repository<Subscription>, {} as Repository<SubscriptionPlan>, dataSource, momo as unknown as MomoService);
    return { service, manager, momo, promo, repository };
  }

  describe('Pilot promotion activation', () => {
    it('is disabled by default and rejects activation without a transaction', async () => {
      vi.stubEnv('SUBSCRIPTION_PROMO_PILOT_ENABLED', 'false');
      try {
        const { service, manager } = pilotFixture();
        expect(service.getCapabilities()).toEqual({ promotionPilotEnabled: false });
        await expect(service.activateWithPromotion('artisan-1', 'plan-1', 'PILOTE2026')).rejects.toBeInstanceOf(ForbiddenException);
        expect(manager.save).not.toHaveBeenCalled();
      } finally { vi.unstubAllEnvs(); }
    });

    it.each([undefined, null, 123, '', 'x', 'a'.repeat(41), 'INVALID CODE'])('rejects malformed code %s', async (code) => {
      vi.stubEnv('SUBSCRIPTION_PROMO_PILOT_ENABLED', 'true');
      try {
        const { service, manager } = pilotFixture();
        await expect(service.activateWithPromotion('artisan-1', 'plan-1', code)).rejects.toBeInstanceOf(BadRequestException);
        expect(manager.save).not.toHaveBeenCalled();
      } finally { vi.unstubAllEnvs(); }
    });

    it.each([[20, 8000, 'pending'], [100, 0, 'not_required']] as const)('activates with %s%% discount without any MoMo call', async (discountPercent, amount, paymentStatus) => {
      vi.stubEnv('SUBSCRIPTION_PROMO_PILOT_ENABLED', 'true');
      try {
        const { service, manager, momo, promo } = pilotFixture({ discountPercent });
        const result = await service.activateWithPromotion('artisan-1', 'plan-1', ' pilote2026 ');
        expect(result).toMatchObject({ status: 'active', provider: 'promotion_pilot', amount, paymentStatus, lastPaymentAt: null, nextPaymentAt: null, redirectUrl: null, discountPercent, originalAmount: 10000 });
        expect(result.endDate!.getTime() - result.startDate!.getTime()).toBeCloseTo(30 * 86400000, -2);
        expect(promo.usedCount).toBe(1);
        expect(manager.create).toHaveBeenCalledWith(PromotionRedemption, { promotionCodeId: 'promo-1', userId: 'artisan-1' });
        expect(manager.findOne).toHaveBeenCalledWith(User, { where: { id: 'artisan-1' }, lock: { mode: 'pessimistic_write' } });
        expect(manager.findOne).toHaveBeenCalledWith(PromotionCode, { where: { code: 'PILOTE2026', active: true }, lock: { mode: 'pessimistic_write' } });
        expect(momo.initiateCollectionPayment).not.toHaveBeenCalled();
      } finally { vi.unstubAllEnvs(); }
    });

    it.each([
      { active: false },
      { expiresAt: new Date(0) },
      { allowedPlanSlugs: ['local-plus'] },
      { usedCount: 10, maxUses: 10 },
    ])('preserves code validation: %j', async (overrides) => {
      vi.stubEnv('SUBSCRIPTION_PROMO_PILOT_ENABLED', 'true');
      try {
        const { service, manager, momo } = pilotFixture(overrides);
        await expect(service.activateWithPromotion('artisan-1', 'plan-1', 'PILOTE2026')).rejects.toBeInstanceOf(BadRequestException);
        expect(manager.save).not.toHaveBeenCalled();
        expect(momo.initiateCollectionPayment).not.toHaveBeenCalled();
      } finally { vi.unstubAllEnvs(); }
    });

    it('rejects reused codes and active subscriptions', async () => {
      vi.stubEnv('SUBSCRIPTION_PROMO_PILOT_ENABLED', 'true');
      try {
        const { service, manager } = pilotFixture();
        const findOne = manager.findOne.getMockImplementation()!;
        manager.findOne.mockImplementation(async (entity) => entity === PromotionRedemption ? { id: 'used' } : findOne(entity));
        await expect(service.activateWithPromotion('artisan-1', 'plan-1', 'PILOTE2026')).rejects.toThrow('déjà été utilisé');
        expect(manager.save).not.toHaveBeenCalled();
        const active = pilotFixture({}, true);
        await expect(active.service.activateWithPromotion('artisan-1', 'plan-1', 'PILOTE2026')).rejects.toThrow('déjà un abonnement actif');
      } finally { vi.unstubAllEnvs(); }
    });

    it('does not allow MoMo confirmation, renewal or webhook to settle pilot debt', async () => {
      const { service, repository, momo } = pilotFixture();
      repository.findOne.mockResolvedValue({ id: 'sub-1', provider: 'promotion_pilot', status: 'active', paymentStatus: 'pending' });
      await expect(service.confirmMomoPayment('artisan-1', 'sub-1')).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.renewSubscription('sub-1')).rejects.toBeInstanceOf(BadRequestException);
      momo.handleWebhook.mockReturnValue({ externalId: 'SUB-sub-1', status: 'SUCCESS' });
      await expect(service.handleMomoWebhook({})).rejects.toBeInstanceOf(BadRequestException);
      expect(momo.getPaymentStatus).not.toHaveBeenCalled();
      expect(momo.initiateCollectionPayment).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('preserves MoMo path and charges discounted amount', async () => {
      const { service, momo } = pilotFixture();
      const result = await service.createSubscription('artisan-1', 'plan-1', '237699000000', 'PILOTE2026');
      expect(result).toMatchObject({ status: 'active', provider: 'momo', amount: 8000 });
      expect(momo.initiateCollectionPayment).toHaveBeenCalledWith(expect.objectContaining({ amount: 8000, payerPhone: '237699000000' }));
    });

    it('exposes outstanding balance while keeping the active plan entitlement', async () => {
      const { service, repository } = pilotFixture();
      repository.find.mockResolvedValue([{ status: 'active', amount: '8000', paymentStatus: 'pending', endDate: new Date(Date.now() + 86400000), plan: { slug: 'premium-growth', name: 'Premium' } }]);
      await expect(service.planStatus('artisan-1')).resolves.toMatchObject({ premium: true, planName: 'Premium', paymentStatus: 'pending', amountDue: 8000 });
    });
  });

  it('désactive Croissance sans supprimer le plan historique', async () => {
    const retiredPlan = makePlan({ id: 'growth-plan', name: 'Croissance', slug: 'croissance', price: 5000 });
    const savedPlans: SubscriptionPlan[] = [];
    const planRepository = {
      find: vi.fn().mockResolvedValue([retiredPlan]),
      findOne: vi.fn().mockResolvedValue(null),
      save: vi.fn(async (plan: SubscriptionPlan) => {
        savedPlans.push(plan);
        return plan;
      }),
      create: vi.fn((plan) => plan),
    } as unknown as Repository<SubscriptionPlan>;
    const service = new SubscriptionsService(
      {} as Repository<Subscription>,
      planRepository,
      {} as DataSource,
      {} as any,
    );

    const plans = await service.getPlans();

    expect(plans.map((plan) => plan.slug)).not.toContain('croissance');
    expect(savedPlans.find((plan) => plan.slug === 'croissance')).toMatchObject({ id: 'growth-plan', isActive: false });
  });

  it('refuse une souscription à un plan inactif', async () => {
    const transactionManager = { findOne: vi.fn().mockResolvedValue(makePlan({ slug: 'croissance', isActive: false })) };
    const dataSource = {
      transaction: vi.fn(async (callback: (manager: any) => unknown) => callback(transactionManager)),
    } as unknown as DataSource;
    const service = new SubscriptionsService(
      {} as Repository<Subscription>,
      {} as Repository<SubscriptionPlan>,
      dataSource,
      {} as any,
    );

    await expect(service.createSubscription('artisan-1', 'growth-plan')).rejects.toBeInstanceOf(NotFoundException);
    expect(transactionManager.findOne).toHaveBeenCalledOnce();
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

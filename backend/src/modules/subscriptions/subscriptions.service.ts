import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, MoreThan, IsNull, Repository } from 'typeorm';
import { PromotionCode, PromotionRedemption, Subscription, SubscriptionPlan } from '../../entities/index.js';
import { MomoService } from '../momo/momo.service.js';

/** Limites de l'offre gratuite, à ajuster après le pilote. */
export const FREE_PLAN_LISTING_LIMIT = 3;

export type SponsoringPolicy = {
  maxSponsored: number;
  durationDays: number;
};

export const SPONSORING_POLICIES: Record<string, SponsoringPolicy> = {
  'visibilite-7': { maxSponsored: 1, durationDays: 7 },
  'local-plus': { maxSponsored: 2, durationDays: 7 },
  'croissance': { maxSponsored: 3, durationDays: 15 },
  'premium-growth': { maxSponsored: 5, durationDays: 30 },
};

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(SubscriptionPlan)
    private planRepository: Repository<SubscriptionPlan>,
    private dataSource: DataSource,
    private momoService: MomoService,
    @Optional()
    @InjectRepository(PromotionCode)
    private promotionRepository?: Repository<PromotionCode>,
  ) {}

  private readonly defaultPlans: Array<{
    slug: string;
    name: string;
    price: number;
    currency: string;
    durationDays: number;
    description: string;
    features: string[];
    sortOrder: number;
  }> = [
    {
      slug: 'starter',
      name: 'Starter',
      price: 0,
      currency: 'XAF',
      durationDays: 30,
      description: 'Pour commencer sans risque et tester les premières demandes.',
      features: ['Profil artisan', '3 annonces actives', 'Réception de demandes de devis', 'Messagerie et WhatsApp'],
      sortOrder: 1,
    },
    {
      slug: 'visibilite-7',
      name: 'Visibilité 7 jours',
      price: 1000,
      currency: 'XAF',
      durationDays: 7,
      description: 'Pour tester la visibilité avec le prix d’un petit coup de pouce.',
      features: ['Tout le plan Starter', '1 annonce mise en avant pendant 7 jours', 'Badge de visibilité locale'],
      sortOrder: 2,
    },
    {
      slug: 'local-plus',
      name: 'Local Plus',
      price: 3000,
      currency: 'XAF',
      durationDays: 30,
      description: 'Le meilleur point de départ pour être visible tout le mois.',
      features: ['Tout le plan Starter', 'Annonces illimitées', '2 annonces mises en avant pendant 7 jours', 'Priorité locale'],
      sortOrder: 3,
    },
    {
      slug: 'croissance',
      name: 'Croissance',
      price: 5000,
      currency: 'XAF',
      durationDays: 30,
      description: 'Pour les artisans qui publient souvent et veulent suivre leur activité.',
      features: ['Tout le plan Local Plus', '3 annonces mises en avant pendant 15 jours', 'Statistiques de base', 'Support prioritaire'],
      sortOrder: 4,
    },
    {
      slug: 'premium-growth',
      name: 'Premium Growth',
      price: 10000,
      currency: 'XAF',
      durationDays: 30,
      description: 'Pour accélérer votre croissance et booster votre activité.',
      features: ['Tout le plan Local Plus', 'Badge Premium Growth', '5 annonces mises en avant pendant 30 jours', 'Galerie vidéo des services', 'Statistiques détaillées et support prioritaire'],
      sortOrder: 5,
    },
  ];

  async getPlans(): Promise<SubscriptionPlan[]> {
    return this.syncDefaultPlans();
  }

  async createDefaultPlans(): Promise<SubscriptionPlan[]> {
    return this.syncDefaultPlans();
  }

  private async syncDefaultPlans(): Promise<SubscriptionPlan[]> {
    const allPlans = await this.planRepository.find();
    const bySlug = new Map(allPlans.filter((plan) => !!plan.slug).map((plan) => [plan.slug, plan]));
    const legacyNames = new Map(
      allPlans
        .filter((plan) => ['Starter', 'Pro', 'Premium', 'Premium Artisan'].includes(plan.name))
        .map((plan) => [plan.name, plan]),
    );

    const savedPlans: SubscriptionPlan[] = [];

    for (const planData of this.getConfiguredPlans()) {
      const existing = bySlug.get(planData.slug) ?? legacyNames.get(planData.name) ?? (await this.planRepository.findOne({ where: { name: planData.name } }));

      if (existing) {
        const updated = {
          ...existing,
          ...planData,
          isActive: true,
        };

        const saved = await this.planRepository.save(updated);
        bySlug.set(saved.slug, saved);
        legacyNames.set(saved.name, saved);
        savedPlans.push(saved);
        continue;
      }

      const created = await this.planRepository.save(this.planRepository.create({ ...planData, isActive: true }));
      bySlug.set(created.slug, created);
      legacyNames.set(created.name, created);
      savedPlans.push(created);
    }

    return savedPlans.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }

  private getConfiguredPlans() {
    if (process.env.MOMO_MODE !== 'sandbox') return this.defaultPlans;

    return this.defaultPlans;
  }

  async createDefaultPlan(): Promise<SubscriptionPlan> {
    const plans = await this.syncDefaultPlans();
    return plans.find((plan) => plan.slug === 'premium-growth') ?? plans[0];
  }

  async createSubscription(userId: string, planId: string, payerPhone?: string, promotionCode?: string): Promise<Subscription & { redirectUrl?: string | null; discountPercent?: number; originalAmount?: number }> {
    return this.dataSource.transaction(async (manager) => {
      const plan = await manager.findOne(SubscriptionPlan, { where: { id: planId } });
      if (!plan) throw new NotFoundException('Plan introuvable');
      const activeSubscription = await manager.findOne(Subscription, { where: { userId, status: 'active' } });
      if (activeSubscription && (!activeSubscription.endDate || activeSubscription.endDate.getTime() > Date.now())) {
        throw new BadRequestException('Vous avez déjà un abonnement actif. Attendez son expiration avant de souscrire à un nouveau plan.');
      }
      const promo = promotionCode ? await manager.findOne(PromotionCode, { where: { code: promotionCode.trim().toUpperCase(), active: true } }) : null;
      if (promotionCode && !promo) throw new BadRequestException('Code promotionnel invalide ou désactivé');
      if (promo?.expiresAt && promo.expiresAt.getTime() <= Date.now()) throw new BadRequestException('Ce code promotionnel a expiré');
      if (promo?.maxUses !== null && promo && promo.usedCount >= promo.maxUses) throw new BadRequestException('Ce code promotionnel a atteint sa limite d’utilisation.');
      if (promo) {
        const previousRedemption = await manager.findOne(PromotionRedemption, { where: { promotionCodeId: promo.id, userId } });
        if (previousRedemption) throw new BadRequestException('Ce code promotionnel a déjà été utilisé sur votre compte.');
      }
      const originalAmount = Number(plan.price);
      const discountPercent = promo?.discountPercent ?? 0;
      const amount = Math.max(0, Math.round(originalAmount * (100 - discountPercent) / 100));

      const subscription = await manager.save(
        manager.create(Subscription, {
          userId,
          planId: plan.id,
          status: 'pending',
          amount,
          currency: plan.currency,
          startDate: new Date(),
          endDate: new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000),
          nextPaymentAt: new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000),
          provider: 'momo',
        }),
      );

      if (amount === 0) {
        if (promo) {
          await manager.save(manager.create(PromotionRedemption, { promotionCodeId: promo.id, userId }));
          promo.usedCount += 1;
          await manager.save(promo);
        }
        subscription.status = 'active';
        subscription.lastPaymentAt = new Date();
        const savedFreeSubscription = await manager.save(subscription);
        return Object.assign(savedFreeSubscription, { redirectUrl: null, discountPercent, originalAmount });
      }

      const normalizedPhone = this.normalizeMomoPhone(payerPhone);

      const result = await this.momoService.initiateCollectionPayment({
        orderId: `SUB-${subscription.id}`,
        amount: Number(plan.price),
        currency: 'XAF',
        externalId: `SUB-${subscription.id}`,
        payerPhone: normalizedPhone,
        callbackUrl: this.momoService.getWebhookUrl('subscriptions/webhook'),
        payerMessage: 'Abonnement ArtisanConnect',
        payeeNote: `Abonnement ${plan.name}`,
      });

      subscription.paymentReference = result.referenceId || `SUB-${subscription.id}`;
      if (result.status === 'SUCCESS') {
        subscription.status = 'active';
        subscription.lastPaymentAt = new Date();
        if (promo) {
          await manager.save(manager.create(PromotionRedemption, { promotionCodeId: promo.id, userId }));
          promo.usedCount += 1;
          await manager.save(promo);
        }
      } else if (result.status === 'FAILED') {
        subscription.status = 'failed';
      }

      const savedSubscription = await manager.save(subscription);
      return Object.assign(savedSubscription, { redirectUrl: result.redirectUrl || null, discountPercent, originalAmount });
    });
  }

  async renewSubscription(subscriptionId: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({ where: { id: subscriptionId }, relations: { plan: true } });
    if (!subscription) throw new NotFoundException('Abonnement introuvable');

    const result = await this.momoService.initiateCollectionPayment({
      orderId: `RENEW-${subscription.id}`,
      amount: Number(subscription.amount),
      currency: 'XAF',
      externalId: `RENEW-${subscription.id}`,
      payerPhone: '000000000',
      callbackUrl: this.momoService.getWebhookUrl('subscriptions/webhook'),
      payerMessage: 'Renouvellement abonnement ArtisanConnect',
      payeeNote: `Renouvellement ${subscription.plan?.name || 'abonnement'}`,
    });

    if (result.status === 'SUCCESS') {
      subscription.status = 'active';
      subscription.lastPaymentAt = new Date();
      subscription.nextPaymentAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      subscription.paymentReference = result.referenceId || subscription.paymentReference;
      return this.subscriptionRepository.save(subscription);
    }

    subscription.status = 'failed';
    return this.subscriptionRepository.save(subscription);
  }

  async findByUser(userId: string): Promise<Subscription[]> {
    return this.subscriptionRepository.find({ where: { userId }, relations: { plan: true } });
  }

  async listPromotionCodes() {
    return this.promotionRepository?.find({ order: { createdAt: 'DESC' } }) ?? [];
  }

  async createPromotionCode(data: { code: string; discountPercent: number; expiresAt?: string | null; maxUses?: number | null }) {
    const code = data.code.trim().toUpperCase();
    const discountPercent = Number(data.discountPercent);
    if (!/^[A-Z0-9_-]{3,40}$/.test(code)) throw new BadRequestException('Le code doit contenir 3 à 40 caractères : lettres, chiffres, tiret ou underscore.');
    if (!Number.isInteger(discountPercent) || discountPercent < 10 || discountPercent > 100) throw new BadRequestException('La remise doit être comprise entre 10 % et 100 %.');
    const maxUses = data.maxUses === null || data.maxUses === undefined || data.maxUses === 0 ? null : Number(data.maxUses);
    if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) throw new BadRequestException('La limite d’utilisation doit être un entier positif.');
    if (!this.promotionRepository) throw new BadRequestException('Les codes promotionnels ne sont pas configurés.');
    const existing = await this.promotionRepository.findOne({ where: { code } });
    if (existing) throw new BadRequestException('Ce code promotionnel existe déjà.');
    return this.promotionRepository.save(this.promotionRepository.create({ code, discountPercent, expiresAt: data.expiresAt ? new Date(data.expiresAt) : null, maxUses }));
  }

  async setPromotionCodeActive(id: string, active: boolean) {
    if (!this.promotionRepository) throw new BadRequestException('Les codes promotionnels ne sont pas configurés.');
    const promo = await this.promotionRepository.findOne({ where: { id } });
    if (!promo) throw new NotFoundException('Code promotionnel introuvable');
    promo.active = active;
    return this.promotionRepository.save(promo);
  }

  /** Un abonnement compte comme Premium tant qu'il est actif et non expiré. */
  async isPremium(userId: string): Promise<boolean> {
    const plan = await this.getActivePlan(userId);
    return Boolean(plan && SPONSORING_POLICIES[plan.slug]);
  }

  async hasActivePlan(userId: string, slug: string): Promise<boolean> {
    const plan = await this.getActivePlan(userId);
    return plan?.slug === slug;
  }

  async getSponsoringPolicy(userId: string): Promise<SponsoringPolicy | null> {
    const plan = await this.getActivePlan(userId);
    return plan ? SPONSORING_POLICIES[plan.slug] ?? null : null;
  }

  private async getActivePlan(userId: string): Promise<SubscriptionPlan | null> {
    const now = new Date();
    const subscriptions = await this.subscriptionRepository.find({
      where: [
        { userId, status: 'active', endDate: MoreThan(now) },
        { userId, status: 'active', endDate: IsNull() },
      ],
      relations: { plan: true },
      order: { createdAt: 'DESC' },
    });

    return subscriptions.find((subscription) => Boolean(subscription.plan))?.plan ?? null;
  }

  async findPremiumUserIds(userIds: string[]): Promise<Set<string>> {
    if (!userIds.length) return new Set();
    const subscriptions = await this.subscriptionRepository.find({
      where: { userId: In(userIds), status: 'active' },
      relations: { plan: true },
    });
    const now = new Date();
    return new Set(
      subscriptions
        .filter((subscription) => (!subscription.endDate || new Date(subscription.endDate) > now) && Boolean(subscription.plan && SPONSORING_POLICIES[subscription.plan.slug]))
        .map((subscription) => subscription.userId),
    );
  }

  /** État du plan affiché à l'artisan : offre courante, échéance et quota d'annonces. */
  async planStatus(userId: string) {
    const now = new Date();
    const subscriptions = await this.subscriptionRepository.find({
      where: { userId },
      relations: { plan: true },
      order: { createdAt: 'DESC' },
    });
    const current = subscriptions.find(
      (subscription) => subscription.status === 'active' && (!subscription.endDate || new Date(subscription.endDate) > now),
    );
    const latestWithPlan = subscriptions.find((subscription) => Boolean(subscription.plan));
    const isPaidPlan = Boolean(current?.plan?.slug && SPONSORING_POLICIES[current.plan.slug]);

    return {
      premium: isPaidPlan,
      planName: current?.plan?.name ?? latestWithPlan?.plan?.name ?? 'Offre gratuite',
      planSlug: current?.plan?.slug ?? latestWithPlan?.plan?.slug ?? null,
      endDate: current?.endDate ?? latestWithPlan?.endDate ?? null,
      listingLimit: isPaidPlan ? null : FREE_PLAN_LISTING_LIMIT,
    };
  }

  private normalizeMomoPhone(phone?: string): string {
    const normalized = String(phone || '').replace(/[\s().-]/g, '');
    if (!/^\+?\d{8,15}$/.test(normalized)) {
      throw new BadRequestException('Numéro MoMo invalide');
    }
    return normalized;
  }

  async confirmMomoPayment(userId: string, referenceId: string): Promise<Subscription> {
    const subscriptionId = referenceId.startsWith('SUB-') ? referenceId.replace('SUB-', '') : referenceId;
    const subscription = await this.subscriptionRepository.findOne({
      where: [
        { userId, paymentReference: referenceId },
        { userId, id: subscriptionId },
      ],
      relations: { plan: true },
    });
    if (!subscription) throw new NotFoundException('Abonnement introuvable pour cette référence MoMo');

    const result = await this.momoService.getPaymentStatus(subscription.paymentReference || `SUB-${subscription.id}`);
    if (result.status === 'SUCCESS') {
      subscription.status = 'active';
      subscription.lastPaymentAt = new Date();
      const durationDays = subscription.plan?.durationDays || 30;
      subscription.endDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
      subscription.nextPaymentAt = subscription.endDate;
      return this.subscriptionRepository.save(subscription);
    }

    if (result.status === 'FAILED' || result.status === 'EXPIRED') {
      subscription.status = 'failed';
      return this.subscriptionRepository.save(subscription);
    }

    return subscription;
  }

  async handleMomoWebhook(body: Record<string, unknown>): Promise<{ success: boolean; message: string }> {
    const payload = this.momoService.handleWebhook(body);
    const externalId = String(payload.externalId || payload.referenceId || '').trim();
    const status = payload.status;

    if (!externalId) {
      return { success: false, message: 'Référence MoMo absente' };
    }

    const subscriptionKey = externalId.startsWith('SUB-') ? externalId.replace('SUB-', '') : externalId;
    const subscription = await this.subscriptionRepository.findOne({ where: { id: subscriptionKey } });
    if (!subscription) {
      return { success: false, message: `Abonnement introuvable ${subscriptionKey}` };
    }

    if (status === 'SUCCESS') {
      subscription.status = 'active';
      subscription.lastPaymentAt = new Date();
      subscription.nextPaymentAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await this.subscriptionRepository.save(subscription);
      return { success: true, message: 'Abonnement activé' };
    }

    if (status === 'FAILED' || status === 'EXPIRED') {
      subscription.status = 'failed';
      await this.subscriptionRepository.save(subscription);
      return { success: true, message: 'Abonnement rejeté' };
    }

    return { success: true, message: 'Webhook abonnement reçu' };
  }
}

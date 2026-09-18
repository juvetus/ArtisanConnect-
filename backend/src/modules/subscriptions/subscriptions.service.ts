import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, MoreThan, IsNull, Repository } from 'typeorm';
import { Subscription, SubscriptionPlan } from '../../entities/index.js';
import { MomoService } from '../momo/momo.service.js';

/** Limites de l'offre gratuite, à ajuster après le pilote. */
export const FREE_PLAN_LISTING_LIMIT = 5;

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(SubscriptionPlan)
    private planRepository: Repository<SubscriptionPlan>,
    private dataSource: DataSource,
    private momoService: MomoService,
  ) {}

  async getPlans(): Promise<SubscriptionPlan[]> {
    return this.planRepository.find({ where: { isActive: true } });
  }

  async createDefaultPlan(): Promise<SubscriptionPlan> {
    const existing = await this.planRepository.findOne({ where: { name: 'Premium Artisan' } });
    if (existing) return existing;

    return this.planRepository.save(
      this.planRepository.create({
        name: 'Premium Artisan',
        price: 5000,
        currency: 'XAF',
        durationDays: 30,
        description: 'Abonnement mensuel ArtisanConnect.',
      }),
    );
  }

  async createSubscription(userId: string, planId: string, payerPhone?: string): Promise<Subscription & { redirectUrl?: string | null }> {
    const normalizedPhone = this.normalizeMomoPhone(payerPhone);

    return this.dataSource.transaction(async (manager) => {
      const plan = await manager.findOne(SubscriptionPlan, { where: { id: planId } });
      if (!plan) throw new NotFoundException('Plan introuvable');

      const subscription = await manager.save(
        manager.create(Subscription, {
          userId,
          planId: plan.id,
          status: 'pending',
          amount: Number(plan.price),
          currency: plan.currency,
          startDate: new Date(),
          endDate: new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000),
          nextPaymentAt: new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000),
          provider: 'momo',
        }),
      );

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
      } else if (result.status === 'FAILED') {
        subscription.status = 'failed';
      }

      const savedSubscription = await manager.save(subscription);
      return Object.assign(savedSubscription, { redirectUrl: result.redirectUrl || null });
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

  /** Un abonnement compte comme Premium tant qu'il est actif et non expiré. */
  async isPremium(userId: string): Promise<boolean> {
    const now = new Date();
    const active = await this.subscriptionRepository.count({
      where: [
        { userId, status: 'active', endDate: MoreThan(now) },
        { userId, status: 'active', endDate: IsNull() },
      ],
    });
    return active > 0;
  }

  async findPremiumUserIds(userIds: string[]): Promise<Set<string>> {
    if (!userIds.length) return new Set();
    const now = new Date();
    const subscriptions = await this.subscriptionRepository.find({
      where: [
        { userId: In(userIds), status: 'active', endDate: MoreThan(now) },
        { userId: In(userIds), status: 'active', endDate: IsNull() },
      ],
      select: { userId: true },
    });
    return new Set(subscriptions.map((subscription) => subscription.userId));
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

    return {
      premium: Boolean(current),
      planName: current?.plan?.name ?? 'Offre gratuite',
      endDate: current?.endDate ?? null,
      listingLimit: current ? null : FREE_PLAN_LISTING_LIMIT,
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

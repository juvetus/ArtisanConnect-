import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Notification } from '../../entities/notification.entity.js';
import { OpportunityDelivery, OpportunityPreference } from '../../entities/opportunity.entity.js';
import { EmailService } from '../email/email.service.js';
import { WhatsAppService } from '../whatsapp/whatsapp.service.js';
import { OpportunitiesService } from './opportunities.service.js';

@Injectable()
export class OpportunityAlertsService {
  private readonly logger = new Logger(OpportunityAlertsService.name);

  constructor(
    private readonly db: DataSource,
    private readonly config: ConfigService,
    private readonly opportunities: OpportunitiesService,
    private readonly email: EmailService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  @Cron('0 6 * * *', { timeZone: 'Africa/Douala' })
  async dailyWatch() {
    if (this.config.get('OPPORTUNITY_WATCH_ENABLED', 'false') !== 'true') return;
    try { await this.opportunities.queueCollection(); }
    catch (error) { this.logger.error(`Veille quotidienne : ${error instanceof Error ? error.message : 'erreur inconnue'}`); }
  }

  @Cron('* * * * *', { timeZone: 'Africa/Douala' })
  async collectionWorker() {
    try { await this.opportunities.processCollectionQueue(); }
    catch (error) { this.logger.error(`Collecteur : ${error instanceof Error ? error.message : 'erreur inconnue'}`); }
  }

  @Cron('*/10 * * * *', { timeZone: 'Africa/Douala' })
  async scheduledAlerts() {
    try { await this.dispatch(); }
    catch (error) { this.logger.error(`Alertes opportunités : ${error instanceof Error ? error.message : 'erreur inconnue'}`); }
  }

  @Cron('5-59/10 * * * *', { timeZone: 'Africa/Douala' })
  async scheduledAnalysis() {
    if (this.config.get('OPPORTUNITY_WATCH_ENABLED', 'false') !== 'true') return;
    try { await this.opportunities.analyzePending(); }
    catch (error) { this.logger.error(`Analyse automatique : ${error instanceof Error ? error.message : 'erreur inconnue'}`); }
  }

  async report() {
    const [items, counts] = await Promise.all([
      this.db.getRepository(OpportunityDelivery).find({ order: { createdAt: 'DESC' }, take: 100 }),
      this.db.getRepository(OpportunityDelivery).createQueryBuilder('delivery')
        .select('delivery.status', 'status').addSelect('COUNT(*)::int', 'count').groupBy('delivery.status').getRawMany(),
    ]);
    return { items, counts };
  }

  async dispatch() {
    const runner = this.db.createQueryRunner();
    await runner.connect();
    let locked = false;
    try {
      const locks: { locked: boolean }[] = await runner.query('SELECT pg_try_advisory_lock(176130002) AS locked');
      locked = locks[0].locked;
      if (!locked) throw new ConflictException('Une diffusion est déjà en cours');
      // Reprise après interruption : on ne réémet jamais automatiquement un envoi potentiellement déjà accepté.
      await this.db.getRepository(OpportunityDelivery).createQueryBuilder().update()
        .set({ status: 'failed', error: 'Envoi interrompu : résultat fournisseur inconnu, vérifier avant toute relance.' })
        .where("status = 'sending' AND \"updatedAt\" < NOW() - INTERVAL '15 minutes'").execute();
      await runner.query(`
        INSERT INTO opportunity_deliveries ("opportunityId", "userId", "channel")
        SELECT o.id, u.id, channel.name
        FROM opportunities o
        JOIN opportunity_preferences p ON p.subscribed = true AND p.trades && o.trades
        JOIN users u ON u.id = p."userId" AND u.role = 'artisan' AND u."isActive" = true AND u."isDemo" IS DISTINCT FROM true
        CROSS JOIN LATERAL (VALUES ('internal'), ('email'), ('whatsapp')) channel(name)
        WHERE o.status = 'published' AND o.deadline > NOW()
          AND ((u."hasRccm" IS TRUE AND u."hasNiu" IS TRUE AND u."hasProfessionalArtisanCard" IS TRUE)
            OR EXISTS (SELECT 1 FROM artisan_formalizations f WHERE f."artisanId" = u.id AND f.status = 'approved'))
          AND (channel.name = 'internal' OR (channel.name = 'email' AND p."emailEnabled")
            OR (channel.name = 'whatsapp' AND p."whatsappEnabled" AND $1))
        ON CONFLICT ("opportunityId", "userId", channel) DO NOTHING
      `, [this.config.get('OPPORTUNITY_WHATSAPP_ENABLED', 'false') === 'true']);
      const pending = await this.db.getRepository(OpportunityDelivery).createQueryBuilder('delivery')
        .where("delivery.status = 'pending'")
        .andWhere("(delivery.channel != 'whatsapp' OR :whatsapp)", {
          whatsapp: this.config.get('OPPORTUNITY_WHATSAPP_ENABLED', 'false') === 'true',
        })
        .orderBy('delivery.createdAt', 'ASC').take(100).getMany();
      for (const delivery of pending) await this.deliver(delivery);
      return { processed: pending.length };
    } finally {
      if (locked) await runner.query('SELECT pg_advisory_unlock(176130002)');
      await runner.release();
    }
  }

  private async deliver(delivery: OpportunityDelivery) {
    const repo = this.db.getRepository(OpportunityDelivery);
    const claim = await repo.update({ id: delivery.id, status: 'pending' }, { status: 'sending' });
    if (!claim.affected) return;
    try {
      const preference = await this.db.getRepository(OpportunityPreference).findOneBy({ userId: delivery.userId });
      const notice = await this.opportunities.get(delivery.opportunityId, true);
      if (delivery.channel === 'whatsapp' && this.config.get('OPPORTUNITY_WHATSAPP_ENABLED', 'false') !== 'true') {
        await repo.update(delivery.id, { status: 'pending', error: 'Canal WhatsApp suspendu en attente de son activation' });
        return;
      }
      const subscribed = preference?.subscribed && preference.trades.some((trade) => notice.trades.includes(trade));
      const channelEnabled = delivery.channel === 'internal' ||
        (delivery.channel === 'email' && preference?.emailEnabled) ||
        (delivery.channel === 'whatsapp' && preference?.whatsappEnabled);
      if (!subscribed || !channelEnabled || notice.status !== 'published' || !notice.deadline || notice.deadline.getTime() <= Date.now()) {
        await repo.update(delivery.id, { status: 'skipped', error: 'Abonnement désactivé, métier modifié ou avis clôturé' });
        return;
      }
      const user = await this.opportunities.assertEligible(delivery.userId);
      if (user.isDemo === true) {
        await repo.update(delivery.id, { status: 'skipped', error: 'Compte de démonstration exclu des alertes' });
        return;
      }
      const title = 'Nouvel appel d’offres pour votre activité';
      const content = `${notice.title}\nMétiers : ${notice.trades.filter((trade) => preference.trades.includes(trade)).join(', ')}.\nDate limite : ${notice.deadline.toLocaleString('fr-FR', { timeZone: 'Africa/Douala' })} (Cameroun).\nVérifiez les conditions et le dossier officiel avant toute candidature.`;
      const link = `/opportunities/${notice.id}`;
      if (delivery.channel === 'internal') {
        await this.db.transaction(async (manager) => {
          await manager.save(Notification, { recipientId: user.id, type: 'general', title, content, link, relatedId: notice.id });
          await manager.update(OpportunityDelivery, delivery.id, { status: 'sent', error: null });
        });
        return;
      }
      const base = this.config.get<string>('FRONTEND_URL');
      if (!base || !/^https?:\/\//.test(base)) throw new Error('FRONTEND_URL doit être configuré pour les alertes externes');
      const url = `${base.replace(/\/$/, '')}${link}`;
      let sent = false;
      if (delivery.channel === 'email') {
        if (!user.verifiedEmail || user.email.endsWith('@phone.artisanconnect.local')) throw new Error('Adresse e-mail non vérifiée');
        sent = await this.email.send({ to: user.email, subject: `[ArtisanConnect] ${title}`, text: `${content}\n\n${url}\n\nGérer mes alertes : ${base.replace(/\/$/, '')}/opportunities` });
      } else {
        if (!user.whatsappPhone && !user.phone) throw new Error('Numéro WhatsApp absent');
        sent = await this.whatsapp.sendNotification(user.whatsappPhone || user.phone, user.name, title, content, url);
      }
      if (!sent) throw new Error('Canal non configuré ou envoi refusé/non confirmé par le fournisseur. Vérifiez les journaux du canal.');
      await repo.update(delivery.id, { status: 'sent', error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 1000) : 'Erreur de diffusion';
      await repo.update(delivery.id, { status: 'failed', error: message });
      this.logger.warn(`Alerte ${delivery.id} (${delivery.channel}) : ${message}`);
    }
  }
}

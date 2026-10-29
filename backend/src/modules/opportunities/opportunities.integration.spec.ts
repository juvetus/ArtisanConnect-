import 'reflect-metadata';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
import * as entities from '../../entities/index.js';
import { OPPORTUNITY_ENTITIES, Opportunity, OpportunityDelivery, OpportunityGroupMember, OpportunityPreference, OpportunityWatchRun } from '../../entities/opportunity.entity.js';
import { ArtisanFormalization, Notification, User } from '../../entities/index.js';
import { OpportunitiesService } from './opportunities.service.js';
import { OpportunityAlertsService } from './opportunity-alerts.service.js';
import { OpportunityWatch1761300000000 } from '../../database/migrations/1761300000000-opportunity-watch.js';
import * as sources from './opportunity-sources.js';
import { OpportunitiesController } from './opportunities.controller.js';

const enabled = process.env.OPPORTUNITY_INTEGRATION === 'true';
const schema = `opportunity_test_${randomUUID().replaceAll('-', '')}`;

describe.skipIf(!enabled)('Opportunity workflow on isolated local PostgreSQL schema', () => {
  let db: DataSource;
  let service: OpportunitiesService;
  let alerts: OpportunityAlertsService;
  let sequence = 0;
  const email = { send: vi.fn().mockResolvedValue(true) };
  const whatsapp = { sendNotification: vi.fn().mockResolvedValue(true) };
  const config = new ConfigService({ FRONTEND_URL: 'https://example.test', AI_API_KEY: 'test-key', AI_BASE_URL: 'https://ai.example.test/v1', OPPORTUNITY_WHATSAPP_ENABLED: 'true', OPPORTUNITY_EMAIL_ENABLED: 'true' });

  beforeAll(async () => {
    const host = process.env.DB_HOST || 'localhost';
    if (!['localhost', '127.0.0.1', '::1'].includes(host)) throw new Error('Integration tests require a local database');
    db = new DataSource({
      type: 'postgres', host, port: Number(process.env.DB_PORT || 5432),
      username: process.env.DB_USERNAME || 'artisan', password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE || 'artisan_connect', schema,
      entities: [...Object.values(entities), ...OPPORTUNITY_ENTITIES],
      synchronize: false, extra: { options: `-c search_path=${schema},public` },
    });
    await db.initialize();
    await db.query(`CREATE SCHEMA "${schema}"`);
    await db.synchronize();
    service = new OpportunitiesService(db.getRepository(Opportunity), db.getRepository(OpportunityWatchRun), db, config);
    alerts = new OpportunityAlertsService(db, config, service, email as never, whatsapp as never);
  }, 60000);

  afterAll(async () => {
    if (db?.isInitialized) {
      try { await db.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); }
      finally { await db.destroy(); }
    }
  });

  beforeEach(async () => {
    config.set('OPPORTUNITY_WHATSAPP_ENABLED', 'true');
    config.set('OPPORTUNITY_EMAIL_ENABLED', 'true');
    email.send.mockClear();
    whatsapp.sendNotification.mockClear();
    email.send.mockResolvedValue(true);
    await db.getRepository(Opportunity).createQueryBuilder().delete().execute();
    await db.getRepository(OpportunityPreference).createQueryBuilder().delete().execute();
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  async function artisan(overrides: Partial<User> = {}) {
    return db.getRepository(User).save(db.getRepository(User).create({
      email: `test${++sequence}@example.test`, passwordHash: 'not-a-real-password', name: `Artisan ${sequence}`,
      role: 'artisan', isActive: true, isDemo: false, verifiedEmail: true,
      hasRccm: true, hasNiu: true, hasProfessionalArtisanCard: true, ...overrides,
    }));
  }

  async function published(trades = ['menuiserie']) {
    const draft = await service.createManual({
      title: 'Fabrication de meubles', organization: 'Organisme test', location: 'Yaoundé',
      reference: 'TEST', sourceUrl: 'https://example.test/tender',
    });
    return service.publish(draft.id, randomUUID(), {
      ...draft, trades, summary: 'Fabrication de mobilier, dossier officiel à consulter.',
      deadline: new Date(Date.now() + 86400000).toISOString(),
    });
  }

  async function subscribe(user: User, trades = ['menuiserie'], external = false) {
    return service.savePreferences(user.id, { subscribed: true, trades, emailEnabled: external, whatsappEnabled: external });
  }

  it('creates production tables through the migration, including idempotent application', async () => {
    const runner = db.createQueryRunner();
    try {
      const migration = new OpportunityWatch1761300000000();
      await migration.down(runner);
      await migration.up(runner);
      await migration.up(runner);
    }
    finally { await runner.release(); }
    expect(await db.getRepository(Opportunity).count()).toBe(0);
  });

  it('persists collection jobs, prevents duplicate queues and deduplicates imported notices', async () => {
    const collect = vi.spyOn(sources, 'collectSource').mockImplementation(async (source) => [{
      source, externalId: 'ref', sourceUrl: `https://${{ armp: 'armp.cm', ungm: 'www.ungm.org', sangobids: 'sangobids.com' }[source]}/notice`,
      title: 'Mobilier test', organization: 'Commune', location: 'Centre', reference: 'TEST', deadline: null,
    }]);
    const job = await service.queueCollection();
    expect(job.status).toBe('queued');
    await expect(service.queueCollection()).rejects.toThrow('déjà en attente');
    await service.processCollectionQueue();
    expect(await db.getRepository(OpportunityWatchRun).findOneByOrFail({ id: job.id })).toMatchObject({ status: 'completed', imported: 3 });
    await service.collect();
    expect(await db.getRepository(Opportunity).count()).toBe(3);
    expect(collect).toHaveBeenCalledTimes(6);
    collect.mockRejectedValue(new Error('Source indisponible'));
    const failed = await service.collect();
    expect(failed.every((run) => run.status === 'failed' && run.error === 'Source indisponible')).toBe(true);
  });

  it('restricts admin actions to admins/editors, and protects artisan endpoints', async () => {
    const controller = new OpportunitiesController(service, alerts);
    const viewer = { id: randomUUID(), email: 'viewer@example.test', role: 'viewer' as const };
    const client = { ...viewer, role: 'client' as const };
    expect(() => controller.collect(viewer)).toThrow('administration');
    expect(() => controller.dispatch(client)).toThrow('administration');
    expect(() => controller.preferences(client)).toThrow('artisans');
    await expect(controller.list(client)).rejects.toThrow('Utilisateur introuvable');
    expect(() => controller.adminList(viewer, '-1')).toThrow('Pagination invalide');
  });

  it('isolates a failed aggregator connector from working official sources', async () => {
    vi.spyOn(sources, 'collectSource').mockImplementation(async (source) => {
      if (source === 'sangobids') throw new Error('Source HTTP 429');
      return [];
    });
    const job = await service.queueCollection();
    await service.processCollectionQueue();
    expect(await db.getRepository(OpportunityWatchRun).findOneByOrFail({ id: job.id })).toMatchObject({
      status: 'failed', error: 'sangobids : Source HTTP 429',
    });
    const runs = await db.getRepository(OpportunityWatchRun).find({ order: { createdAt: 'DESC' }, take: 3 });
    expect(runs.filter((run) => run.source !== 'sangobids').every((run) => run.status === 'completed')).toBe(true);
    expect(runs.find((run) => run.source === 'sangobids')).toMatchObject({ status: 'failed', error: 'Source HTTP 429' });
  });

  it('requires formalization or an approved dossier and an active artisan role', async () => {
    const user = await artisan({ hasNiu: null });
    await expect(service.assertEligible(user.id)).rejects.toThrow('réservé');
    await db.getRepository(ArtisanFormalization).save({ artisan: user, businessName: 'Atelier test', status: 'approved', progress: 100 });
    expect((await service.assertEligible(user.id)).id).toBe(user.id);
    await db.getRepository(User).update(user.id, { isActive: false });
    await expect(service.assertEligible(user.id)).rejects.toThrow('réservé');
  });

  it('only lists published non-expired notices and validates before publication', async () => {
    const draft = await service.createManual({ title: 'Test', organization: 'Commune', location: 'Centre', sourceUrl: 'https://example.test/notice' });
    expect((await service.list()).total).toBe(0);
    await expect(service.publish(draft.id, randomUUID(), { ...draft, summary: 'Test', trades: [], deadline: new Date(Date.now() + 50000).toISOString() })).rejects.toThrow('métier');
    const notice = await published();
    expect((await service.list()).items.map((item) => item.id)).toEqual([notice.id]);
    await expect(service.publish(notice.id, randomUUID(), { ...notice, deadline: notice.deadline?.toISOString() })).rejects.toThrow('déjà traité');
    await db.getRepository(Opportunity).update(notice.id, { deadline: new Date(0) });
    expect((await service.list()).total).toBe(0);
  });

  it('validates AI vocabulary and stores failures instead of inventing an analysis', async () => {
    const notice = await service.createManual({ title: 'Test', organization: 'Test', location: 'Centre', sourceUrl: 'https://example.test/notice' });
    const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ summary: 'Résumé', trades: ['unknown'] }) } }] }), { headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', mock);
    await expect(service.analyze(notice.id)).rejects.toThrow('Métiers invalides');
    expect(await db.getRepository(Opportunity).findOneByOrFail({ id: notice.id })).toMatchObject({ analysisStatus: 'failed' });
    mock.mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ summary: 'Mobilier à fabriquer.', trades: ['menuiserie'] }) } }] }), { headers: { 'Content-Type': 'application/json' } }));
    expect(await service.analyze(notice.id)).toMatchObject({ analysisStatus: 'done', trades: ['menuiserie'] });
  });

  it('matches trades and consent, excludes ineligible/demo users, and deduplicates all channels', async () => {
    const user = await artisan({ phone: '+237699000001' });
    await subscribe(user, ['menuiserie'], true);
    const wrongTrade = await artisan(); await subscribe(wrongTrade, ['plomberie']);
    const inactive = await artisan(); await subscribe(inactive);
    await db.getRepository(User).update(inactive.id, { isActive: false });
    const demo = await artisan({ isDemo: true }); await subscribe(demo);
    const notice = await published();
    await alerts.dispatch();
    await alerts.dispatch();
    const deliveries = await db.getRepository(OpportunityDelivery).findBy({ opportunityId: notice.id });
    expect(deliveries).toHaveLength(3);
    expect(deliveries.every((item) => item.userId === user.id && item.status === 'sent')).toBe(true);
    expect(await db.getRepository(Notification).countBy({ recipientId: user.id, relatedId: notice.id })).toBe(1);
    expect(email.send).toHaveBeenCalledOnce();
    expect(whatsapp.sendNotification).toHaveBeenCalledOnce();
  });

  it('suspends WhatsApp without affecting e-mail and resumes pending deliveries after activation', async () => {
    const user = await artisan({ phone: '+237699000003' });
    await subscribe(user, ['menuiserie'], true);
    const notice = await published();
    await db.getRepository(OpportunityDelivery).save({ opportunityId: notice.id, userId: user.id, channel: 'whatsapp' });
    config.set('OPPORTUNITY_WHATSAPP_ENABLED', 'false');
    expect(service.configuration().whatsappAvailable).toBe(false);
    await alerts.dispatch();
    expect(whatsapp.sendNotification).not.toHaveBeenCalled();
    expect(email.send).toHaveBeenCalledOnce();
    expect(await db.getRepository(OpportunityDelivery).findOneByOrFail({ opportunityId: notice.id, channel: 'whatsapp' })).toMatchObject({ status: 'pending' });
    config.set('OPPORTUNITY_WHATSAPP_ENABLED', 'true');
    await alerts.dispatch();
    expect(whatsapp.sendNotification).toHaveBeenCalledOnce();
  });

  it('does not silently succeed or retry an unconfirmed external delivery', async () => {
    const user = await artisan({ phone: '+237699000002' });
    await subscribe(user, ['menuiserie'], true);
    email.send.mockResolvedValue(false);
    const notice = await published();
    await alerts.dispatch(); await alerts.dispatch();
    expect(await db.getRepository(OpportunityDelivery).findOneByOrFail({ opportunityId: notice.id, userId: user.id, channel: 'email' })).toMatchObject({ status: 'failed', error: expect.stringContaining('non confirmé') });
    expect(email.send).toHaveBeenCalledOnce();
    expect(await db.getRepository(Notification).countBy({ recipientId: user.id, relatedId: notice.id })).toBe(1);
  });

  it('suspends e-mail without consuming pending deliveries or blocking internal notifications', async () => {
    const user = await artisan({ phone: '+237699000004' });
    await subscribe(user, ['menuiserie'], true);
    const notice = await published();
    await db.getRepository(OpportunityDelivery).save({ opportunityId: notice.id, userId: user.id, channel: 'email' });
    config.set('OPPORTUNITY_EMAIL_ENABLED', 'false');
    expect(service.configuration().emailAvailable).toBe(false);
    await alerts.dispatch();
    expect(email.send).not.toHaveBeenCalled();
    expect(await db.getRepository(Notification).countBy({ recipientId: user.id, relatedId: notice.id })).toBe(1);
    expect(await db.getRepository(OpportunityDelivery).findOneByOrFail({ opportunityId: notice.id, channel: 'email' })).toMatchObject({ status: 'pending' });
    config.set('OPPORTUNITY_EMAIL_ENABLED', 'true');
    await alerts.dispatch();
    expect(email.send).toHaveBeenCalledOnce();
  });

  it('checks consent again just before processing an already queued alert', async () => {
    const user = await artisan();
    const notice = await published();
    await subscribe(user);
    await db.getRepository(OpportunityDelivery).save({ opportunityId: notice.id, userId: user.id, channel: 'internal' });
    await service.savePreferences(user.id, { subscribed: false, trades: [], emailEnabled: false, whatsappEnabled: false });
    await alerts.dispatch();
    expect(await db.getRepository(OpportunityDelivery).findOneByOrFail({ userId: user.id })).toMatchObject({ status: 'skipped' });
    expect(await db.getRepository(Notification).countBy({ recipientId: user.id, relatedId: notice.id })).toBe(0);
  });

  it('skips an already queued alert after the notice is archived', async () => {
    const user = await artisan();
    const notice = await published();
    await subscribe(user);
    await db.getRepository(OpportunityDelivery).save({ opportunityId: notice.id, userId: user.id, channel: 'internal' });
    await service.archive(notice.id);
    await alerts.dispatch();
    expect(await db.getRepository(OpportunityDelivery).findOneByOrFail({ userId: user.id })).toMatchObject({ status: 'skipped' });
    expect(await db.getRepository(Notification).countBy({ recipientId: user.id, relatedId: notice.id })).toBe(0);
  });

  it('handles group consent, owner permissions, privacy and concurrent capacity limits', async () => {
    const owner = await artisan(), first = await artisan(), second = await artisan(), visitor = await artisan();
    const notice = await published();
    const group = await service.createGroup(notice.id, owner.id, { name: 'Groupement test', description: 'Menuisiers recherchés', capacity: 2 });
    const member1 = await service.joinGroup(group.id, first.id);
    const member2 = await service.joinGroup(group.id, second.id);
    expect((await service.groups(notice.id, visitor.id))[0].members).toHaveLength(1);
    await expect(service.reviewMember(group.id, member1.id, visitor.id, true)).rejects.toThrow('créateur');
    const results = await Promise.allSettled([
      service.reviewMember(group.id, member1.id, owner.id, true),
      service.reviewMember(group.id, member2.id, owner.id, true),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(await db.getRepository(OpportunityGroupMember).countBy({ groupId: group.id, status: 'accepted' })).toBe(2);
    const members = await db.getRepository(OpportunityGroupMember).findBy({ groupId: group.id, status: 'accepted' });
    const accepted = members.find((member) => member.userId !== owner.id)!;
    await service.leaveGroup(group.id, accepted.userId);
    await service.closeGroup(group.id, owner.id);
    await expect(service.joinGroup(group.id, visitor.id)).rejects.toThrow('fermé');
  });
});

import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
import * as entities from '../../entities/index.js';
import { ArtisanFormalization, InstitutionalProgram, InstitutionalResource, Listing, Order, ProgramApplication, Shop, User } from '../../entities/index.js';
import { InstitutionsService } from './institutions.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { normalizeGeography, validateGeography } from './institution-geography.js';
import { ShopDistrict1761400000000 } from '../../database/migrations/1761400000000-shop-district.js';

describe('institution geographic filter validation', () => {
  it('normalizes accents, case and whitespace without partial matching', () => {
    expect(normalizeGeography('  YAOUNDÉ   I ')).toBe('yaounde i');
    expect(normalizeGeography('Yaoundé II')).not.toBe(normalizeGeography('Yaoundé I'));
    expect(validateGeography({ city: ' Yaoundé ', district: '' })).toEqual({ city: 'Yaoundé' });
  });

  it('rejects repeated query parameters, objects, controls and oversized values', () => {
    for (const value of [['Yaoundé'], {}, 'a'.repeat(151), 'a\nb']) {
      expect(() => validateGeography(JSON.parse(JSON.stringify({ city: value })))).toThrow('invalide');
    }
  });
});

const schema = `institution_geo_test_${randomUUID().replaceAll('-', '')}`;
describe.skipIf(process.env.INSTITUTION_INTEGRATION !== 'true')('institution geography on an isolated local PostgreSQL schema', () => {
  let db: DataSource;
  let service: InstitutionsService;
  let institution: User;
  let first: User;
  let second: User;
  let unlocated: User;

  beforeAll(async () => {
    const host = process.env.DB_HOST || 'localhost';
    if (!['localhost', '127.0.0.1', '::1'].includes(host)) throw new Error('Local database required');
    vi.stubEnv('DEMO_MODE', 'false');
    db = new DataSource({
      type: 'postgres', host, port: Number(process.env.DB_PORT || 5432),
      username: process.env.DB_USERNAME || 'artisan',
      password: process.env.DB_PASSWORD || 'artisan_password_dev',
      database: process.env.DB_DATABASE || 'artisan_connect',
      schema, entities: Object.values(entities), synchronize: false,
      extra: { options: `-c search_path=${schema},public` },
    });
    await db.initialize();
    await db.query(`CREATE SCHEMA "${schema}"`);
    await db.synchronize();
    const module = await Test.createTestingModule({
      providers: [
        InstitutionsService,
        ...[User, Listing, Order, InstitutionalResource, InstitutionalProgram, ArtisanFormalization, ProgramApplication].map((entity) => ({
          provide: getRepositoryToken(entity), useValue: db.getRepository(entity),
        })),
        { provide: NotificationsService, useValue: {} },
      ],
    }).compile();
    service = module.get(InstitutionsService);
    const users = db.getRepository(User);
    async function user(name: string, role: User['role'] = 'artisan', gender: User['gender'] = 'male', isDemo = false) {
      return users.save(users.create({ name, email: `${randomUUID()}@example.test`, passwordHash: 'test-only', role, gender, isDemo }));
    }
    institution = await user('Institution', 'institution');
    first = await user('Artisan A', 'artisan', 'female');
    second = await user('Artisan B', 'artisan', 'cooperative');
    unlocated = await user('Sans boutique');
    await users.update(unlocated.id, { city: 'Bafoussam', district: 'Bafoussam I', neighborhood: 'Centre' });
    const demo = await user('Demo', 'artisan', 'female', true);
    const shops = db.getRepository(Shop);
    async function shop(seller: User, city: string, district: string | null, neighborhood: string, isDemo = false) {
      return shops.save(shops.create({ sellerId: seller.id, name: 'Atelier', description: 'Test', type: 'artisan', city, district, neighborhood, mobileMoneyNumber: '+237600000000', deliveryMode: 'workshop', isDemo }));
    }
    await shop(first, 'Yaoundé', 'Yaoundé I', 'Bastos');
    await shop(first, ' YAOUNDÉ ', 'Yaoundé I', ' Bastos ');
    await shop(first, 'Douala', 'Douala I', 'Akwa');
    await shop(second, 'Yaoundé', 'Yaoundé II', 'Tsinga');
    await shop(second, 'Kribi', null, 'Centre');
    await shop(demo, 'Yaoundé', 'Yaoundé I', 'Bastos', true);
    await shop(first, 'Demo city', 'Demo district', 'Demo quarter', true);
    const program = await db.getRepository(InstitutionalProgram).save(db.getRepository(InstitutionalProgram).create({
      title: 'Programme', description: 'Test', type: 'support', institutionId: institution.id,
    }));
    await db.getRepository(ProgramApplication).save([
      db.getRepository(ProgramApplication).create({ artisanId: first.id, programId: program.id, motivation: 'Test', status: 'accepted' }),
      db.getRepository(ProgramApplication).create({ artisanId: second.id, programId: program.id, motivation: 'Test', status: 'submitted' }),
    ]);
    await db.getRepository(ArtisanFormalization).save(db.getRepository(ArtisanFormalization).create({
      artisan: second, reviewedBy: institution, businessName: 'Entreprise B', status: 'approved',
    }));
  }, 60000);

  afterAll(async () => {
    vi.unstubAllEnvs();
    if (db?.isInitialized) {
      try { await db.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); }
      finally { await db.destroy(); }
    }
  });

  it('preserves unfiltered totals and counts each artisan once', async () => {
    const { stats } = await service.dashboard(institution.id);
    expect(stats.artisans).toBe(3);
    expect(stats.womenArtisans).toBe(1);
    expect(stats.cooperativeArtisans).toBe(1);
    expect((await service.listArtisans()).map((user) => user.id)).toContain(unlocated.id);
  });

  it('combines filters on the same shop, ignoring accents and casing', async () => {
    const filters = { city: 'yaounde', district: 'YAOUNDE I', neighborhood: 'bastos' };
    const { stats } = await service.dashboard(institution.id, filters);
    expect(stats.artisans).toBe(1);
    expect(stats.womenPercentage).toBe(100);
    expect(stats.approvedFormalizations).toBe(1);
    expect(stats.pendingFormalizations).toBe(0);
    expect((await service.listArtisans(filters)).map((user) => user.id)).toEqual([first.id]);
    expect((await service.dashboard(institution.id, { city: 'Douala', neighborhood: 'Bastos' })).stats.artisans).toBe(0);
  });

  it('returns zero scoped dossier counts instead of falling back to all dossiers', async () => {
    const { stats } = await service.dashboard(institution.id, { city: 'Unknown' });
    expect(stats.artisans).toBe(0);
    expect(stats.pendingFormalizations).toBe(0);
    expect(stats.approvedFormalizations).toBe(0);
    expect(stats.programs).toBe(1);
  });

  it('keeps unclassified districts available through city filters only', async () => {
    expect((await service.listArtisans({ city: 'Kribi' })).map((user) => user.id)).toEqual([second.id]);
    expect(await service.listArtisans({ city: 'Kribi', district: 'Kribi I' })).toEqual([]);
  });

  it('uses registration geography for artisans without a shop', async () => {
    const filters = { city: 'Bafoussam', district: 'Bafoussam I' };
    expect((await service.listArtisans(filters)).map((user) => user.id)).toEqual([unlocated.id]);
    expect((await service.dashboard(institution.id, filters)).stats.artisans).toBe(1);
    expect(await service.geographyOptions()).toContainEqual({ city: 'Bafoussam', district: 'Bafoussam I', neighborhood: 'Centre' });
    const csv = await service.csvReport(institution.id, filters);
    expect(csv).toContain('"Sans boutique","Bafoussam","Bafoussam I","Centre"');
  });
  it('exports the same geographic scope and excludes other artisans and dossiers', async () => {
    const csv = await service.csvReport(institution.id, { city: 'yaounde', district: 'Yaoundé I' });
    expect(csv).toContain('"artisans_suivis","1"');
    expect(csv).toContain('"arrondissement","Yaoundé I"');
    expect(csv).toContain('Artisan A');
    expect(csv).not.toContain('Artisan B');
    expect(csv).not.toContain('Entreprise B');
  });

  it('provides declared options without demo locations', async () => {
    const options = await service.geographyOptions();
    expect(options.some((option) => option.city === 'Kribi' && option.district === null)).toBe(true);
    expect(options.some((option) => option.city === 'Demo city')).toBe(false);
  });

  it('adds nullable districts to existing shops without guessing their geography', async () => {
    const runner = db.createQueryRunner();
    await runner.connect();
    try {
      const migration = new ShopDistrict1761400000000();
      await migration.down(runner);
      await migration.up(runner);
      await migration.up(runner);
      expect((await db.getRepository(Shop).find()).every((shop) => shop.district === null)).toBe(true);
    } finally {
      await runner.release();
    }
  });
});

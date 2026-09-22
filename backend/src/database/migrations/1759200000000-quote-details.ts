import type { MigrationInterface, QueryRunner } from 'typeorm';

export class QuoteDetails1759200000000 implements MigrationInterface {
  name = 'QuoteDetails1759200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "service_quotes" ADD COLUMN IF NOT EXISTS "quoteNumber" character varying');
    await queryRunner.query('ALTER TABLE "service_quotes" ADD COLUMN IF NOT EXISTS "currency" character varying NOT NULL DEFAULT \'XAF\'');
    await queryRunner.query('ALTER TABLE "service_quotes" ADD COLUMN IF NOT EXISTS "items" jsonb NOT NULL DEFAULT \'[]\'');
    await queryRunner.query('ALTER TABLE "service_quotes" ADD COLUMN IF NOT EXISTS "terms" text');
    await queryRunner.query('UPDATE "service_quotes" SET "quoteNumber" = \'DEV-\' || to_char("createdAt", \'YYYYMMDD\') || \'-\' || upper(substr(replace("id"::text, \'-\', \'\'), 1, 6)) WHERE "quoteNumber" IS NULL');
    await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS "IDX_service_quotes_quoteNumber" ON "service_quotes" ("quoteNumber")');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_service_quotes_quoteNumber"');
    await queryRunner.query('ALTER TABLE "service_quotes" DROP COLUMN IF EXISTS "quoteNumber"');
    await queryRunner.query('ALTER TABLE "service_quotes" DROP COLUMN IF EXISTS "currency"');
    await queryRunner.query('ALTER TABLE "service_quotes" DROP COLUMN IF EXISTS "items"');
    await queryRunner.query('ALTER TABLE "service_quotes" DROP COLUMN IF EXISTS "terms"');
  }
}

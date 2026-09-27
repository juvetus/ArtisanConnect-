import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CatalogDemoFlags1760300000000 implements MigrationInterface {
  name = 'CatalogDemoFlags1760300000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "isDemo" boolean');
    await queryRunner.query('ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "isDemo" boolean');
    await queryRunner.query('UPDATE "listings" SET "isDemo" = true');
    await queryRunner.query('UPDATE "services" SET "isDemo" = true');
    await queryRunner.query('ALTER TABLE "listings" ALTER COLUMN "isDemo" SET DEFAULT false');
    await queryRunner.query('ALTER TABLE "services" ALTER COLUMN "isDemo" SET DEFAULT false');
    await queryRunner.query('ALTER TABLE "listings" ALTER COLUMN "isDemo" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "services" ALTER COLUMN "isDemo" SET NOT NULL');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "services" DROP COLUMN IF EXISTS "isDemo"');
    await queryRunner.query('ALTER TABLE "listings" DROP COLUMN IF EXISTS "isDemo"');
  }
}
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class IwomipayTransactions1761000000000 implements MigrationInterface {
  name = 'IwomipayTransactions1761000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "iwomipayExternalId" character varying');
    await queryRunner.query('ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "iwomipayInternalId" character varying');
    await queryRunner.query('ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "iwomipayRedirectUrl" text');
    await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS "IDX_payments_iwomipay_external_id" ON "payments" ("iwomipayExternalId") WHERE "iwomipayExternalId" IS NOT NULL');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_payments_iwomipay_external_id"');
    await queryRunner.query('ALTER TABLE "payments" DROP COLUMN IF EXISTS "iwomipayRedirectUrl"');
    await queryRunner.query('ALTER TABLE "payments" DROP COLUMN IF EXISTS "iwomipayInternalId"');
    await queryRunner.query('ALTER TABLE "payments" DROP COLUMN IF EXISTS "iwomipayExternalId"');
  }
}

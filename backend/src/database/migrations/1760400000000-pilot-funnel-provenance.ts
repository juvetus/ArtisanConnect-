import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Null means legacy/unclassified; new writes set the provenance explicitly. */
export class PilotFunnelProvenance1760400000000 implements MigrationInterface {
  name = 'PilotFunnelProvenance1760400000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isDemo" boolean');
    await queryRunner.query('ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "isDemo" boolean');
    await queryRunner.query('ALTER TABLE "institutional_programs" ADD COLUMN IF NOT EXISTS "isDemo" boolean');
    await queryRunner.query('ALTER TABLE "institutional_resources" ADD COLUMN IF NOT EXISTS "isDemo" boolean');
    await queryRunner.query('ALTER TABLE "program_applications" ADD COLUMN IF NOT EXISTS "isDemo" boolean');
    await queryRunner.query('ALTER TABLE "analytics_events" ADD COLUMN IF NOT EXISTS "isDemo" boolean');
    await queryRunner.query('ALTER TABLE "customer_requests" ADD COLUMN IF NOT EXISTS "isDemo" boolean');
    await queryRunner.query('ALTER TABLE "service_orders" ADD COLUMN IF NOT EXISTS "isDemo" boolean');
    await queryRunner.query('ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "isDemo" boolean');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "isDemo"');
    await queryRunner.query('ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "isDemo"');
    await queryRunner.query('ALTER TABLE "institutional_programs" DROP COLUMN IF EXISTS "isDemo"');
    await queryRunner.query('ALTER TABLE "institutional_resources" DROP COLUMN IF EXISTS "isDemo"');
    await queryRunner.query('ALTER TABLE "program_applications" DROP COLUMN IF EXISTS "isDemo"');
    await queryRunner.query('ALTER TABLE "shops" DROP COLUMN IF EXISTS "isDemo"');
    await queryRunner.query('ALTER TABLE "service_orders" DROP COLUMN IF EXISTS "isDemo"');
    await queryRunner.query('ALTER TABLE "customer_requests" DROP COLUMN IF EXISTS "isDemo"');
    await queryRunner.query('ALTER TABLE "analytics_events" DROP COLUMN IF EXISTS "isDemo"');
  }
}
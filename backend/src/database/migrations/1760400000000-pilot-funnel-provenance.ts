import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Null means legacy/unclassified; new writes set the provenance explicitly. */
export class PilotFunnelProvenance1760400000000 implements MigrationInterface {
  name = 'PilotFunnelProvenance1760400000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "invoices" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "orderId" uuid NOT NULL, "invoiceNumber" character varying NOT NULL, "buyerId" uuid NOT NULL, "sellerId" uuid NOT NULL, "subtotal" numeric(12,0) NOT NULL, "taxRate" numeric(5,2) NOT NULL DEFAULT 0, "taxAmount" numeric(12,0) NOT NULL DEFAULT 0, "total" numeric(12,0) NOT NULL, "currency" character varying NOT NULL DEFAULT 'XAF', "status" character varying NOT NULL DEFAULT 'issued', "issuedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_invoices_orderId" UNIQUE ("orderId"), CONSTRAINT "UQ_invoices_invoiceNumber" UNIQUE ("invoiceNumber"), CONSTRAINT "PK_invoices_id" PRIMARY KEY ("id"))`);
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
    await queryRunner.query('DROP TABLE IF EXISTS "invoices"');
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
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Invoices1760500000000 implements MigrationInterface {
  name = 'Invoices1760500000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "invoices" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "orderId" uuid NOT NULL, "invoiceNumber" character varying NOT NULL, "buyerId" uuid NOT NULL, "sellerId" uuid NOT NULL, "subtotal" numeric(12,0) NOT NULL, "taxRate" numeric(5,2) NOT NULL DEFAULT 0, "taxAmount" numeric(12,0) NOT NULL DEFAULT 0, "total" numeric(12,0) NOT NULL, "currency" character varying NOT NULL DEFAULT 'XAF', "status" character varying NOT NULL DEFAULT 'issued', "issuedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_invoices_orderId" UNIQUE ("orderId"), CONSTRAINT "UQ_invoices_invoiceNumber" UNIQUE ("invoiceNumber"), CONSTRAINT "PK_invoices_id" PRIMARY KEY ("id"))`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "invoices"');
  }
}

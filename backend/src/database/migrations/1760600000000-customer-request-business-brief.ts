import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CustomerRequestBusinessBrief1760600000000 implements MigrationInterface {
  name = 'CustomerRequestBusinessBrief1760600000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "customer_requests" ADD COLUMN IF NOT EXISTS "requestType" character varying NOT NULL DEFAULT 'personal'`);
    await queryRunner.query(`ALTER TABLE "customer_requests" ADD COLUMN IF NOT EXISTS "organizationName" character varying`);
    await queryRunner.query(`ALTER TABLE "customer_requests" ADD COLUMN IF NOT EXISTS "requestedQuantity" integer`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "customer_requests" DROP COLUMN IF EXISTS "requestedQuantity"`);
    await queryRunner.query(`ALTER TABLE "customer_requests" DROP COLUMN IF EXISTS "organizationName"`);
    await queryRunner.query(`ALTER TABLE "customer_requests" DROP COLUMN IF EXISTS "requestType"`);
  }
}
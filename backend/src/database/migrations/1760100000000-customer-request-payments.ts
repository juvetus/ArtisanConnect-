import { MigrationInterface, QueryRunner } from 'typeorm';

export class CustomerRequestPayments1760100000000 implements MigrationInterface {
  name = 'CustomerRequestPayments1760100000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "customer_requests" ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP');
    await queryRunner.query('ALTER TABLE "customer_requests" ADD COLUMN IF NOT EXISTS "paymentStatus" character varying NOT NULL DEFAULT \'unpaid\'');
    await queryRunner.query('ALTER TABLE "customer_requests" ADD COLUMN IF NOT EXISTS "paymentMethod" character varying');
    await queryRunner.query('ALTER TABLE "customer_requests" ADD COLUMN IF NOT EXISTS "paymentAmount" numeric(12,0)');
    await queryRunner.query('ALTER TABLE "customer_requests" ADD COLUMN IF NOT EXISTS "paymentReference" character varying');
    await queryRunner.query('ALTER TABLE "customer_requests" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const column of ['paidAt', 'paymentReference', 'paymentAmount', 'paymentMethod', 'paymentStatus', 'deliveredAt']) {
      await queryRunner.query(`ALTER TABLE "customer_requests" DROP COLUMN IF EXISTS "${column}"`);
    }
  }
}

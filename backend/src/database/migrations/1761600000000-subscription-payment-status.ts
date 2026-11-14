import { MigrationInterface, QueryRunner } from 'typeorm';

export class SubscriptionPaymentStatus1761600000000 implements MigrationInterface {
  name = 'SubscriptionPaymentStatus1761600000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "paymentStatus" character varying');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "paymentStatus"');
  }
}

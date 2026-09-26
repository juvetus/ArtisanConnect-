import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CustomerRequestAdminReplies1760200000000 implements MigrationInterface {
  name = 'CustomerRequestAdminReplies1760200000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "customer_requests" ADD COLUMN IF NOT EXISTS "adminReply" text');
    await queryRunner.query('ALTER TABLE "customer_requests" ADD COLUMN IF NOT EXISTS "adminRepliedAt" TIMESTAMP');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "customer_requests" DROP COLUMN IF EXISTS "adminRepliedAt"');
    await queryRunner.query('ALTER TABLE "customer_requests" DROP COLUMN IF EXISTS "adminReply"');
  }
}
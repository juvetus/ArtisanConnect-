import { MigrationInterface, QueryRunner } from 'typeorm';

export class PromotionMaxUses1759700000000 implements MigrationInterface {
  name = 'PromotionMaxUses1759700000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "promotion_codes" ADD COLUMN IF NOT EXISTS "maxUses" integer');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "promotion_codes" DROP COLUMN IF EXISTS "maxUses"');
  }
}
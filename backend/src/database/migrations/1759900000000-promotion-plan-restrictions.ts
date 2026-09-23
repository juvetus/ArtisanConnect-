import { MigrationInterface, QueryRunner } from 'typeorm';

export class PromotionPlanRestrictions1759900000000 implements MigrationInterface {
  name = 'PromotionPlanRestrictions1759900000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "promotion_codes" ADD COLUMN IF NOT EXISTS "allowedPlanSlugs" text');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "promotion_codes" DROP COLUMN IF EXISTS "allowedPlanSlugs"');
  }
}
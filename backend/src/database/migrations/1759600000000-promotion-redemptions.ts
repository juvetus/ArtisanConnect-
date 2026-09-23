import { MigrationInterface, QueryRunner } from 'typeorm';

export class PromotionRedemptions1759600000000 implements MigrationInterface {
  name = 'PromotionRedemptions1759600000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "promotion_redemptions" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "promotionCodeId" uuid NOT NULL, "userId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_promotion_redemptions_id" PRIMARY KEY ("id"))`);
    await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS "IDX_promotion_redemptions_code_user" ON "promotion_redemptions" ("promotionCodeId", "userId")');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "promotion_redemptions"');
  }
}
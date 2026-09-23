import { MigrationInterface, QueryRunner } from 'typeorm';

export class PromotionCodes1759500000000 implements MigrationInterface {
  name = 'PromotionCodes1759500000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "promotion_codes" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "code" character varying NOT NULL, "discountPercent" integer NOT NULL, "active" boolean NOT NULL DEFAULT true, "expiresAt" TIMESTAMP, "usedCount" integer NOT NULL DEFAULT 0, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_promotion_codes_code" UNIQUE ("code"), CONSTRAINT "PK_promotion_codes_id" PRIMARY KEY ("id"))`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "promotion_codes"');
  }
}
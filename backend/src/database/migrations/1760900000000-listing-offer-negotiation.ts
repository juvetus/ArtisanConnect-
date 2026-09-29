import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ListingOfferNegotiation1760900000000 implements MigrationInterface {
  name = 'ListingOfferNegotiation1760900000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "listing_offers" ADD COLUMN IF NOT EXISTS "lastProposedBy" character varying NOT NULL DEFAULT 'buyer'`);
    await queryRunner.query(`ALTER TABLE "listing_offers" ADD COLUMN IF NOT EXISTS "negotiationHistory" jsonb NOT NULL DEFAULT '[]'::jsonb`);
    await queryRunner.query(`UPDATE "listing_offers" SET "negotiationHistory" = jsonb_build_array(jsonb_build_object('proposedBy', 'buyer', 'unitPrice', "offeredUnitPrice", 'message', "message", 'createdAt', "createdAt")) WHERE "negotiationHistory" = '[]'::jsonb`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "listing_offers" DROP COLUMN IF EXISTS "negotiationHistory"');
    await queryRunner.query('ALTER TABLE "listing_offers" DROP COLUMN IF EXISTS "lastProposedBy"');
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class ListingAiImages1759400000000 implements MigrationInterface {
  name = 'ListingAiImages1759400000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "aiImageUrls" text');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "listings" DROP COLUMN IF EXISTS "aiImageUrls"');
  }
}
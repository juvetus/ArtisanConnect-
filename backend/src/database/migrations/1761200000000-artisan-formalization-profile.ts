import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ArtisanFormalizationProfile1761200000000 implements MigrationInterface {
  name = 'ArtisanFormalizationProfile1761200000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "hasRccm" boolean');
    await queryRunner.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "hasNiu" boolean');
    await queryRunner.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "hasProfessionalArtisanCard" boolean');
    await queryRunner.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "hasProfessionalAccount" boolean');
    await queryRunner.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "hasFixedWorkshop" boolean');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "hasFixedWorkshop"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "hasProfessionalAccount"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "hasProfessionalArtisanCard"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "hasNiu"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "hasRccm"');
  }
}

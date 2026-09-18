import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Mise en avant payante des annonces (publicité sponsorisée). */
export class ListingSponsoring1758700000000 implements MigrationInterface {
  name = 'ListingSponsoring1758700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "sponsoredUntil" TIMESTAMP`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_listings_sponsored_until" ON "listings" ("sponsoredUntil")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_listings_sponsored_until"`);
    await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN IF EXISTS "sponsoredUntil"`);
  }
}

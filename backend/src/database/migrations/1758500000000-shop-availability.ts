import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Disponibilité déclarée par l'artisan, affichée sur sa fiche publique. */
export class ShopAvailability1758500000000 implements MigrationInterface {
  name = 'ShopAvailability1758500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "availability" character varying NOT NULL DEFAULT 'available'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "shops" DROP COLUMN IF EXISTS "availability"`);
  }
}

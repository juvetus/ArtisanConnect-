import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Un service peut n'avoir qu'une fourchette (priceMin/priceMax) sans montant fixe. */
export class ServicePriceNullable1760700000000 implements MigrationInterface {
  name = 'ServicePriceNullable1760700000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "services" ALTER COLUMN "price" DROP NOT NULL');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('UPDATE "services" SET "price" = 0 WHERE "price" IS NULL');
    await queryRunner.query('ALTER TABLE "services" ALTER COLUMN "price" SET NOT NULL');
  }
}

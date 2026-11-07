import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ShopDistrict1761400000000 implements MigrationInterface {
  name = 'ShopDistrict1761400000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "district" character varying`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "shops" DROP COLUMN IF EXISTS "district"`);
  }
}

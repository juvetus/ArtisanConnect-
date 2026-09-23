import { MigrationInterface, QueryRunner } from 'typeorm';

export class ServiceSponsoring1760000000000 implements MigrationInterface {
  name = 'ServiceSponsoring1760000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "sponsoredUntil" TIMESTAMP');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "services" DROP COLUMN IF EXISTS "sponsoredUntil"');
  }
}
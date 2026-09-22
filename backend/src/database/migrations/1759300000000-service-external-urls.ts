import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ServiceExternalUrls1759300000000 implements MigrationInterface {
  name = 'ServiceExternalUrls1759300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "externalUrls" text');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "services" DROP COLUMN IF EXISTS "externalUrls"');
  }
}

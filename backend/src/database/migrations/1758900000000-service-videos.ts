import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ServiceVideos1758900000000 implements MigrationInterface {
  name = 'ServiceVideos1758900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "videoUrls" text');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "services" DROP COLUMN IF EXISTS "videoUrls"');
  }
}

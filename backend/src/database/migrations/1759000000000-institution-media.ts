import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InstitutionMedia1759000000000 implements MigrationInterface {
  name = 'InstitutionMedia1759000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "institutional_resources" ADD COLUMN IF NOT EXISTS "imageUrls" text');
    await queryRunner.query('ALTER TABLE "institutional_resources" ADD COLUMN IF NOT EXISTS "videoUrls" text');
    await queryRunner.query('ALTER TABLE "institutional_programs" ADD COLUMN IF NOT EXISTS "imageUrls" text');
    await queryRunner.query('ALTER TABLE "institutional_programs" ADD COLUMN IF NOT EXISTS "videoUrls" text');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "institutional_resources" DROP COLUMN IF EXISTS "imageUrls"');
    await queryRunner.query('ALTER TABLE "institutional_resources" DROP COLUMN IF EXISTS "videoUrls"');
    await queryRunner.query('ALTER TABLE "institutional_programs" DROP COLUMN IF EXISTS "imageUrls"');
    await queryRunner.query('ALTER TABLE "institutional_programs" DROP COLUMN IF EXISTS "videoUrls"');
  }
}

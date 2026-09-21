import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InstitutionPdfs1759100000000 implements MigrationInterface {
  name = 'InstitutionPdfs1759100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "institutional_resources" ADD COLUMN IF NOT EXISTS "pdfUrls" text');
    await queryRunner.query('ALTER TABLE "institutional_programs" ADD COLUMN IF NOT EXISTS "pdfUrls" text');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "institutional_resources" DROP COLUMN IF EXISTS "pdfUrls"');
    await queryRunner.query('ALTER TABLE "institutional_programs" DROP COLUMN IF EXISTS "pdfUrls"');
  }
}

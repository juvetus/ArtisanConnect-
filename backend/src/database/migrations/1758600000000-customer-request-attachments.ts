import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Photos, préférence de contact et téléphone sur les demandes de devis. */
export class CustomerRequestAttachments1758600000000 implements MigrationInterface {
  name = 'CustomerRequestAttachments1758600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "customer_requests" ADD COLUMN IF NOT EXISTS "fileUrls" text`);
    await queryRunner.query(`ALTER TABLE "customer_requests" ADD COLUMN IF NOT EXISTS "contactPreference" character varying NOT NULL DEFAULT 'platform'`);
    await queryRunner.query(`ALTER TABLE "customer_requests" ADD COLUMN IF NOT EXISTS "contactPhone" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "customer_requests" DROP COLUMN IF EXISTS "contactPhone"`);
    await queryRunner.query(`ALTER TABLE "customer_requests" DROP COLUMN IF EXISTS "contactPreference"`);
    await queryRunner.query(`ALTER TABLE "customer_requests" DROP COLUMN IF EXISTS "fileUrls"`);
  }
}

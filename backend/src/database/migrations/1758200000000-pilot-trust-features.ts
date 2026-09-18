import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Colonnes et tables ajoutées pour la vérification progressive et la modération.
 * Écrite en SQL idempotent : les bases de développement ont déjà été créées par `synchronize`.
 */
export class PilotTrustFeatures1758200000000 implements MigrationInterface {
  name = 'PilotTrustFeatures1758200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "identityVerified" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "identityVerifiedAt" TIMESTAMP`);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "reports_targettype_enum" AS ENUM ('listing', 'shop', 'user', 'review');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "reports_reason_enum" AS ENUM ('fraud', 'inappropriate', 'counterfeit', 'spam', 'wrong_info', 'other');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "reports_status_enum" AS ENUM ('open', 'reviewing', 'resolved', 'dismissed');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "reports" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "reporterId" character varying NOT NULL,
        "targetType" "reports_targettype_enum" NOT NULL,
        "targetId" character varying NOT NULL,
        "reason" "reports_reason_enum" NOT NULL,
        "details" text NOT NULL,
        "status" "reports_status_enum" NOT NULL DEFAULT 'open',
        "moderatorId" character varying,
        "moderatorNotes" text,
        "resolvedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_reports_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_reports_status" ON "reports" ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_reports_target" ON "reports" ("targetType", "targetId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "reports"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "reports_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "reports_reason_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "reports_targettype_enum"`);
    await queryRunner.query(`ALTER TABLE "shops" DROP COLUMN IF EXISTS "identityVerifiedAt"`);
    await queryRunner.query(`ALTER TABLE "shops" DROP COLUMN IF EXISTS "identityVerified"`);
  }
}

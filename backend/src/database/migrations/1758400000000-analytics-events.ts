import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Table des évènements d'usage servant au tunnel de conversion. */
export class AnalyticsEvents1758400000000 implements MigrationInterface {
  name = 'AnalyticsEvents1758400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "analytics_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "type" character varying NOT NULL,
        "sessionId" character varying(64) NOT NULL,
        "userId" character varying,
        "label" character varying(120),
        "targetId" character varying,
        "city" character varying(120),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_analytics_events_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_analytics_events_type_date" ON "analytics_events" ("type", "createdAt")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_analytics_events_session" ON "analytics_events" ("sessionId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "analytics_events"`);
  }
}

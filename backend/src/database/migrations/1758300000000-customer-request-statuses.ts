import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Statuts métier des demandes clients : nouvelle → contactée → en cours → terminée. */
export class CustomerRequestStatuses1758300000000 implements MigrationInterface {
  name = 'CustomerRequestStatuses1758300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "customer_requests" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "customer_requests" ALTER COLUMN "status" TYPE character varying USING "status"::text`);
    await queryRunner.query(`UPDATE "customer_requests" SET "status" = 'new' WHERE "status" = 'open'`);
    await queryRunner.query(`UPDATE "customer_requests" SET "status" = 'in_progress' WHERE "status" = 'assigned'`);
    await queryRunner.query(`UPDATE "customer_requests" SET "status" = 'completed' WHERE "status" = 'closed'`);
    await queryRunner.query(`ALTER TABLE "customer_requests" ALTER COLUMN "status" SET DEFAULT 'new'`);
    await queryRunner.query(`DROP TYPE IF EXISTS "customer_requests_status_enum"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "customer_requests" SET "status" = 'open' WHERE "status" IN ('new', 'contacted')`);
    await queryRunner.query(`UPDATE "customer_requests" SET "status" = 'assigned' WHERE "status" = 'in_progress'`);
    await queryRunner.query(`UPDATE "customer_requests" SET "status" = 'closed' WHERE "status" = 'completed'`);
    await queryRunner.query(`ALTER TABLE "customer_requests" ALTER COLUMN "status" SET DEFAULT 'open'`);
  }
}

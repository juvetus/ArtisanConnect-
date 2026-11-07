import type { MigrationInterface, QueryRunner } from 'typeorm';

export class UserGeography1761500000000 implements MigrationInterface {
  name = 'UserGeography1761500000000';

  async up(runner: QueryRunner): Promise<void> {
    for (const field of ['city', 'district', 'neighborhood']) {
      await runner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "${field}" character varying`);
    }
  }

  async down(runner: QueryRunner): Promise<void> {
    for (const field of ['city', 'district', 'neighborhood']) {
      await runner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "${field}"`);
    }
  }
}

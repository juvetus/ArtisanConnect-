import type { MigrationInterface, QueryRunner } from 'typeorm';

export class UserAvatar1758800000000 implements MigrationInterface {
  name = 'UserAvatar1758800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatarUrl" character varying');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "avatarUrl"');
  }
}

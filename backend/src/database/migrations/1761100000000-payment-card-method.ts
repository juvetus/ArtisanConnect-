import type { MigrationInterface, QueryRunner } from 'typeorm';

export class PaymentCardMethod1761100000000 implements MigrationInterface {
  name = 'PaymentCardMethod1761100000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "payments_method_enum" ADD VALUE IF NOT EXISTS 'card'`);
  }

  async down(): Promise<void> {
    // PostgreSQL cannot remove an enum value without recreating the enum type.
  }
}

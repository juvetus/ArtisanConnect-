import { MigrationInterface, QueryRunner } from 'typeorm';

export class AiImageGenerations1759800000000 implements MigrationInterface {
  name = 'AiImageGenerations1759800000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "ai_image_generations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "userId" uuid NOT NULL, "subscriptionId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ai_image_generations_id" PRIMARY KEY ("id"))`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "ai_image_generations"');
  }
}
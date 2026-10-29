import type { MigrationInterface, QueryRunner } from 'typeorm';

export class OpportunityWatch1761300000000 implements MigrationInterface {
  name = 'OpportunityWatch1761300000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS opportunities (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        source varchar NOT NULL, "externalId" varchar NOT NULL, "sourceUrl" text NOT NULL,
        title text NOT NULL, organization varchar NOT NULL DEFAULT '', location varchar NOT NULL DEFAULT '',
        reference varchar NOT NULL DEFAULT '', deadline timestamptz, summary text NOT NULL DEFAULT '',
        trades text[] NOT NULL DEFAULT '{}', status varchar NOT NULL DEFAULT 'draft',
        "analysisStatus" varchar NOT NULL DEFAULT 'pending', "analysisError" text,
        "reviewedById" uuid, "publishedAt" timestamptz,
        "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(),
        UNIQUE (source, "externalId")
      );
      CREATE INDEX IF NOT EXISTS "IDX_opportunities_status_deadline" ON opportunities (status, deadline);
      CREATE TABLE IF NOT EXISTS opportunity_watch_runs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source varchar NOT NULL,
        status varchar NOT NULL DEFAULT 'running', fetched integer NOT NULL DEFAULT 0,
        imported integer NOT NULL DEFAULT 0, error text, "createdAt" timestamp NOT NULL DEFAULT now(),
        "finishedAt" timestamptz
      );
      CREATE TABLE IF NOT EXISTS opportunity_preferences (
        "userId" uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        subscribed boolean NOT NULL DEFAULT false, trades text[] NOT NULL DEFAULT '{}',
        "emailEnabled" boolean NOT NULL DEFAULT false, "whatsappEnabled" boolean NOT NULL DEFAULT false,
        "updatedAt" timestamp NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS opportunity_deliveries (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "opportunityId" uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
        "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        channel varchar NOT NULL, status varchar NOT NULL DEFAULT 'pending', error text,
        "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(),
        UNIQUE ("opportunityId", "userId", channel)
      );
      CREATE INDEX IF NOT EXISTS "IDX_opportunity_deliveries_status_created" ON opportunity_deliveries (status, "createdAt");
      CREATE TABLE IF NOT EXISTS opportunity_groups (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "opportunityId" uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
        "ownerId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name varchar NOT NULL, description text NOT NULL, capacity integer NOT NULL CHECK (capacity BETWEEN 2 AND 20),
        status varchar NOT NULL DEFAULT 'open', "createdAt" timestamp NOT NULL DEFAULT now(),
        UNIQUE ("opportunityId", "ownerId")
      );
      CREATE TABLE IF NOT EXISTS opportunity_group_members (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "groupId" uuid NOT NULL REFERENCES opportunity_groups(id) ON DELETE CASCADE,
        "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status varchar NOT NULL DEFAULT 'pending', "createdAt" timestamp NOT NULL DEFAULT now(),
        UNIQUE ("groupId", "userId")
      );
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS opportunity_group_members;
      DROP TABLE IF EXISTS opportunity_groups;
      DROP TABLE IF EXISTS opportunity_deliveries;
      DROP TABLE IF EXISTS opportunity_preferences;
      DROP TABLE IF EXISTS opportunity_watch_runs;
      DROP TABLE IF EXISTS opportunities;
    `);
  }
}

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ListingOffers1760800000000 implements MigrationInterface {
  name = 'ListingOffers1760800000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "listing_offers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "buyerId" uuid NOT NULL,
        "sellerId" uuid NOT NULL,
        "listingId" uuid NOT NULL,
        "quantity" integer NOT NULL,
        "offeredUnitPrice" numeric(12,0) NOT NULL,
        "message" text,
        "status" character varying NOT NULL DEFAULT 'pending',
        "paymentMethod" character varying NOT NULL,
        "deliveryMethod" character varying NOT NULL,
        "deliveryAddress" text,
        "orderId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_listing_offers_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_listing_offers_buyer" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_listing_offers_seller" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_listing_offers_listing" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_listing_offers_order" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_listing_offers_buyer_created" ON "listing_offers" ("buyerId", "createdAt")');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_listing_offers_seller_status" ON "listing_offers" ("sellerId", "status", "createdAt")');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "listing_offers"');
  }
}

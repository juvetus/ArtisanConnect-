import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import {
  User,
  Listing,
  Order,
  Payment,
  Review,
  Message,
  InstitutionalResource,
  InstitutionalProgram,
  ArtisanFormalization,
  Shop,
  Notification,
  Service,
  ServiceOrder,
  ServiceQuote,
  ServicePayment,
  ServiceReview,
  ServiceValidationHistory,
  ProgramApplication,
  Subscription,
  SubscriptionPlan,
  PromotionCode,
  PromotionRedemption,
  AiImageGeneration,
  Payout,
  CustomerRequest,
  Report,
  AnalyticsEvent,
} from '../entities/index.js';
import { PilotTrustFeatures1758200000000 } from './migrations/1758200000000-pilot-trust-features.js';
import { CustomerRequestStatuses1758300000000 } from './migrations/1758300000000-customer-request-statuses.js';
import { AnalyticsEvents1758400000000 } from './migrations/1758400000000-analytics-events.js';
import { ShopAvailability1758500000000 } from './migrations/1758500000000-shop-availability.js';
import { CustomerRequestAttachments1758600000000 } from './migrations/1758600000000-customer-request-attachments.js';
import { ListingSponsoring1758700000000 } from './migrations/1758700000000-listing-sponsoring.js';
import { UserAvatar1758800000000 } from './migrations/1758800000000-user-avatar.js';
import { ServiceVideos1758900000000 } from './migrations/1758900000000-service-videos.js';
import { InstitutionMedia1759000000000 } from './migrations/1759000000000-institution-media.js';
import { InstitutionPdfs1759100000000 } from './migrations/1759100000000-institution-pdfs.js';
import { QuoteDetails1759200000000 } from './migrations/1759200000000-quote-details.js';
import { ServiceExternalUrls1759300000000 } from './migrations/1759300000000-service-external-urls.js';
import { ListingAiImages1759400000000 } from './migrations/1759400000000-listing-ai-images.js';
import { PromotionCodes1759500000000 } from './migrations/1759500000000-promotion-codes.js';
import { PromotionRedemptions1759600000000 } from './migrations/1759600000000-promotion-redemptions.js';
import { PromotionMaxUses1759700000000 } from './migrations/1759700000000-promotion-max-uses.js';
import { AiImageGenerations1759800000000 } from './migrations/1759800000000-ai-image-generations.js';
import { PromotionPlanRestrictions1759900000000 } from './migrations/1759900000000-promotion-plan-restrictions.js';
import { ServiceSponsoring1760000000000 } from './migrations/1760000000000-service-sponsoring.js';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'artisan'),
        password: configService.get('DB_PASSWORD', 'artisan_password_dev'),
        database: configService.get('DB_DATABASE', 'artisan_connect'),
        entities: [User, Listing, Order, Payment, Review, Message, InstitutionalResource, InstitutionalProgram, ArtisanFormalization, Shop, Notification, Service, ServiceOrder, ServiceQuote, ServicePayment, ServiceReview, ServiceValidationHistory, ProgramApplication, Subscription, SubscriptionPlan, PromotionCode, PromotionRedemption, AiImageGeneration, Payout, CustomerRequest, Report, AnalyticsEvent],
        synchronize: configService.get('DB_SYNCHRONIZE', configService.get('NODE_ENV') === 'development' ? 'true' : 'false') === 'true',
        migrations: [PilotTrustFeatures1758200000000, CustomerRequestStatuses1758300000000, AnalyticsEvents1758400000000, ShopAvailability1758500000000, CustomerRequestAttachments1758600000000, ListingSponsoring1758700000000, UserAvatar1758800000000, ServiceVideos1758900000000, InstitutionMedia1759000000000, InstitutionPdfs1759100000000, QuoteDetails1759200000000, ServiceExternalUrls1759300000000, ListingAiImages1759400000000, PromotionCodes1759500000000, PromotionRedemptions1759600000000, PromotionMaxUses1759700000000, AiImageGenerations1759800000000, PromotionPlanRestrictions1759900000000, ServiceSponsoring1760000000000],
        // En production `synchronize` est désactivé : le schéma évolue uniquement par migrations.
        migrationsRun: configService.get('DB_SYNCHRONIZE', configService.get('NODE_ENV') === 'development' ? 'true' : 'false') !== 'true',
        logging: configService.get('NODE_ENV') === 'development',
        retryAttempts: Number(configService.get('DB_RETRY_ATTEMPTS', 10)),
        retryDelay: Number(configService.get('DB_RETRY_DELAY', 3000)),
      }),
    }),
    TypeOrmModule.forFeature([User, Listing, Order, Payment, Review, Message, InstitutionalResource, InstitutionalProgram, ArtisanFormalization, Shop, Notification, Service, ServiceOrder, ServiceQuote, ServicePayment, ServiceReview, ServiceValidationHistory, ProgramApplication, Subscription, SubscriptionPlan, PromotionCode, PromotionRedemption, AiImageGeneration, Payout, CustomerRequest, Report, AnalyticsEvent]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}


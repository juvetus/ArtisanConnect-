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
  Payout,
  CustomerRequest,
  Report,
} from '../entities/index.js';
import { PilotTrustFeatures1758200000000 } from './migrations/1758200000000-pilot-trust-features.js';
import { CustomerRequestStatuses1758300000000 } from './migrations/1758300000000-customer-request-statuses.js';

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
        entities: [User, Listing, Order, Payment, Review, Message, InstitutionalResource, InstitutionalProgram, ArtisanFormalization, Shop, Notification, Service, ServiceOrder, ServiceQuote, ServicePayment, ServiceReview, ServiceValidationHistory, ProgramApplication, Subscription, SubscriptionPlan, Payout, CustomerRequest, Report],
        synchronize: configService.get('DB_SYNCHRONIZE', configService.get('NODE_ENV') === 'development' ? 'true' : 'false') === 'true',
        migrations: [PilotTrustFeatures1758200000000, CustomerRequestStatuses1758300000000],
        // En production `synchronize` est désactivé : le schéma évolue uniquement par migrations.
        migrationsRun: configService.get('DB_SYNCHRONIZE', configService.get('NODE_ENV') === 'development' ? 'true' : 'false') !== 'true',
        logging: configService.get('NODE_ENV') === 'development',
        retryAttempts: Number(configService.get('DB_RETRY_ATTEMPTS', 10)),
        retryDelay: Number(configService.get('DB_RETRY_DELAY', 3000)),
      }),
    }),
    TypeOrmModule.forFeature([User, Listing, Order, Payment, Review, Message, InstitutionalResource, InstitutionalProgram, ArtisanFormalization, Shop, Notification, Service, ServiceOrder, ServiceQuote, ServicePayment, ServiceReview, ServiceValidationHistory, ProgramApplication, Subscription, SubscriptionPlan, Payout, CustomerRequest, Report]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}


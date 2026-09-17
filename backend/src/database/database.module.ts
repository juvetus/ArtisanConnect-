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
} from '../entities/index.js';

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
        entities: [User, Listing, Order, Payment, Review, Message, InstitutionalResource, InstitutionalProgram, ArtisanFormalization, Shop, Notification, Service, ServiceOrder, ServiceQuote, ServicePayment, ServiceReview, ServiceValidationHistory, ProgramApplication, Subscription, SubscriptionPlan, Payout, CustomerRequest],
        synchronize: configService.get('DB_SYNCHRONIZE', configService.get('NODE_ENV') === 'development' ? 'true' : 'false') === 'true',
        logging: configService.get('NODE_ENV') === 'development',
        retryAttempts: Number(configService.get('DB_RETRY_ATTEMPTS', 10)),
        retryDelay: Number(configService.get('DB_RETRY_DELAY', 3000)),
      }),
    }),
    TypeOrmModule.forFeature([User, Listing, Order, Payment, Review, Message, InstitutionalResource, InstitutionalProgram, ArtisanFormalization, Shop, Notification, Service, ServiceOrder, ServiceQuote, ServicePayment, ServiceReview, ServiceValidationHistory, ProgramApplication, Subscription, SubscriptionPlan, Payout, CustomerRequest]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}


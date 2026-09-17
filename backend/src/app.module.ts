import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { ListingsModule } from './modules/listings/listings.module.js';
import { OrdersModule } from './modules/orders/orders.module.js';
import { PaymentsModule } from './modules/payments/payments.module.js';
import { ReviewsModule } from './modules/reviews/reviews.module.js';
import { MessagesModule } from './modules/messages/messages.module.js';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './modules/auth/jwt-auth.guard.js';
import { AdminModule } from './modules/admin/admin.module.js';
import { InstitutionsModule } from './modules/institutions/institutions.module.js';
import { ShopsModule } from './modules/shops/shops.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { ServicesModule } from './modules/services/services.module.js';
import { EmailModule } from './modules/email/email.module.js';
import { ServiceOrdersModule } from './modules/service-orders/service-orders.module.js';
import { ServiceReviewsModule } from './modules/service-reviews/service-reviews.module.js';
import { ReportsModule } from './modules/reports/reports.module.js';
import { ContactModule } from './modules/contact/contact.module.js';
import { ProgramApplicationsModule } from './modules/program-applications/program-applications.module.js';
import { DeliveryModule } from './modules/delivery/delivery.module.js';
import { StorageModule } from './modules/storage/storage.module.js';
import { MomoModule } from './modules/momo/momo.module.js';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module.js';
import { PayoutsModule } from './modules/payouts/payouts.module.js';
import { CustomerRequestsModule } from './modules/customer-requests/customer-requests.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    ListingsModule,
    OrdersModule,
    PaymentsModule,
    ReviewsModule,
    MessagesModule,
    AdminModule,
    InstitutionsModule,
    ShopsModule,
    NotificationsModule,
    ServicesModule,
    EmailModule,
    ServiceOrdersModule,
    ServiceReviewsModule,
    ReportsModule,
    ContactModule,
    ProgramApplicationsModule,
    DeliveryModule,
    StorageModule,
    MomoModule,
    SubscriptionsModule,
    PayoutsModule,
    CustomerRequestsModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerRequest, Shop, Listing, User, ServiceReview, Service } from '../../entities/index.js';
import { ListingsModule } from '../listings/listings.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module.js';
import { CustomerRequestsModule } from '../customer-requests/customer-requests.module.js';
import { ShopsService } from './shops.service.js';
import { ShopsController } from './shops.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Shop, Listing, User, ServiceReview, Service, CustomerRequest]),
    forwardRef(() => ListingsModule),
    NotificationsModule,
    SubscriptionsModule,
    CustomerRequestsModule,
  ],
  controllers: [ShopsController],
  providers: [ShopsService],
  exports: [ShopsService],
})
export class ShopsModule {}

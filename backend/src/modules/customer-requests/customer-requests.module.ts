import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerRequest, Listing, Service, Shop, User } from '../../entities/index.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { EmailModule } from '../email/email.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module.js';
import { CustomerRequestsController } from './customer-requests.controller.js';
import { CustomerRequestsService } from './customer-requests.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerRequest, User, Listing, Service, Shop]), NotificationsModule, EmailModule, StorageModule, SubscriptionsModule],
  controllers: [CustomerRequestsController],
  providers: [CustomerRequestsService],
})
export class CustomerRequestsModule {}

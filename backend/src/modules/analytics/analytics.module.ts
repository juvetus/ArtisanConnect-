import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsEvent, CustomerRequest, Listing, Order, Review, Service, ServiceOrder, ServiceReview, Shop, Subscription, User } from '../../entities/index.js';
import { AnalyticsService } from './analytics.service.js';
import { AnalyticsController } from './analytics.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([AnalyticsEvent, CustomerRequest, Listing, Order, Review, Service, ServiceOrder, ServiceReview, Shop, Subscription, User])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}

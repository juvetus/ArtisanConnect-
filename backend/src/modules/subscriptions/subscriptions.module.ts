import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiImageGeneration, PromotionCode, Subscription, SubscriptionPlan } from '../../entities/index.js';
import { SubscriptionsService } from './subscriptions.service.js';
import { SubscriptionsController } from './subscriptions.controller.js';
import { MomoModule } from '../momo/momo.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Subscription, SubscriptionPlan, PromotionCode, AiImageGeneration]), MomoModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}

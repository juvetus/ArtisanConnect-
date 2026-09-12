import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceReview } from '../../entities/service-review.entity.js';
import { ServiceOrder } from '../../entities/service-order.entity.js';
import { ServiceReviewsController } from './service-reviews.controller.js';
import { ServiceReviewsService } from './service-reviews.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceReview, ServiceOrder])],
  controllers: [ServiceReviewsController],
  providers: [ServiceReviewsService],
  exports: [ServiceReviewsService],
})
export class ServiceReviewsModule {}

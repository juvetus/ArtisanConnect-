import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Service } from '../../entities/service.entity.js';
import { ServicesController } from './services.controller.js';
import { ServicesService } from './services.service.js';
import { EmailModule } from '../email/email.module.js';
import { ServiceReview } from '../../entities/service-review.entity.js';
import { ServiceValidationHistory } from '../../entities/service-validation-history.entity.js';
import { User } from '../../entities/user.entity.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Service, ServiceReview, ServiceValidationHistory, User]), ScheduleModule.forRoot(), EmailModule, NotificationsModule],
  controllers: [ServicesController],
  providers: [ServicesService],
  exports: [ServicesService],
})
export class ServicesModule {}

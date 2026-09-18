import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Report, User } from '../../entities/index.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { ModerationService } from './moderation.service.js';
import { ModerationController } from './moderation.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Report, User]), NotificationsModule],
  controllers: [ModerationController],
  providers: [ModerationService],
  exports: [ModerationService],
})
export class ModerationModule {}

import { Module } from '@nestjs/common';
import { AssistantController } from './assistant.controller.js';
import { AssistantService } from './assistant.service.js';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiImageGeneration } from '../../entities/index.js';

@Module({
  imports: [SubscriptionsModule, TypeOrmModule.forFeature([AiImageGeneration])],
  controllers: [AssistantController],
  providers: [AssistantService],
})
export class AssistantModule {}

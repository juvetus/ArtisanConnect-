import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message, ServiceOrder, User } from '../../entities/index.js';
import { EmailModule } from '../email/email.module.js';
import { MessagesService } from './messages.service.js';
import { MessagesController } from './messages.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Message, ServiceOrder, User]), EmailModule],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}




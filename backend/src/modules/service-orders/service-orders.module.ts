import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceOrder } from '../../entities/service-order.entity.js';
import { Service } from '../../entities/service.entity.js';
import { ServiceQuote } from '../../entities/service-quote.entity.js';
import { ServiceOrdersController } from './service-orders.controller.js';
import { ServiceOrdersService } from './service-orders.service.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { EmailModule } from '../email/email.module.js';
import { ServicePayment } from '../../entities/service-payment.entity.js';
import { User } from '../../entities/user.entity.js';
import { ReportsModule } from '../reports/reports.module.js';
import { WhatsAppModule } from '../whatsapp/whatsapp.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceOrder, Service, ServiceQuote, ServicePayment, User]), NotificationsModule, EmailModule, ReportsModule, WhatsAppModule],
  controllers: [ServiceOrdersController],
  providers: [ServiceOrdersService],
  exports: [ServiceOrdersService],
})
export class ServiceOrdersModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceOrder } from '../../entities/service-order.entity.js';
import { Service } from '../../entities/service.entity.js';
import { ServiceQuote } from '../../entities/service-quote.entity.js';
import { ServiceOrdersController } from './service-orders.controller.js';
import { ServiceOrdersService } from './service-orders.service.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { ServicePayment } from '../../entities/service-payment.entity.js';
import { User } from '../../entities/user.entity.js';
import { ReportsModule } from '../reports/reports.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceOrder, Service, ServiceQuote, ServicePayment, User]), NotificationsModule, ReportsModule],
  controllers: [ServiceOrdersController],
  providers: [ServiceOrdersService],
  exports: [ServiceOrdersService],
})
export class ServiceOrdersModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../../entities/index.js';
import { DeliveryController } from './delivery.controller.js';
import { DeliveryCarrierService } from './delivery-carrier.service.js';
import { DeliveryOrdersService } from './delivery-orders.service.js';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Order])],
  controllers: [DeliveryController],
  providers: [DeliveryCarrierService, DeliveryOrdersService],
  exports: [DeliveryCarrierService, DeliveryOrdersService],
})
export class DeliveryModule {}

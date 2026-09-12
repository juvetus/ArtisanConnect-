import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DeliveryCarrierService } from './delivery-carrier.service.js';

@Module({
  imports: [ConfigModule],
  providers: [DeliveryCarrierService],
  exports: [DeliveryCarrierService],
})
export class DeliveryModule {}

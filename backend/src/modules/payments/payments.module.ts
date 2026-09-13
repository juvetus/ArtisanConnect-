import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order, Payment } from '../../entities/index.js';
import { PaymentsService } from './payments.service.js';
import { EscrowService } from './escrow.service.js';
import { OrangeMoneyService } from './orange-money.service.js';
import { PaymentsController } from './payments.controller.js';
import { ShopsModule } from '../shops/shops.module.js';
import { MomoModule } from '../momo/momo.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Order]), ShopsModule, MomoModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, EscrowService, OrangeMoneyService],
  exports: [PaymentsService, EscrowService, OrangeMoneyService],
})
export class PaymentsModule {}




import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payout } from '../../entities/index.js';
import { PayoutsService } from './payouts.service.js';
import { PayoutsController } from './payouts.controller.js';
import { MomoModule } from '../momo/momo.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Payout]), MomoModule],
  controllers: [PayoutsController],
  providers: [PayoutsService],
  exports: [PayoutsService],
})
export class PayoutsModule {}

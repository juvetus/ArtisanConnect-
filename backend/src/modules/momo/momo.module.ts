import { Module } from '@nestjs/common';
import { MomoController } from './momo.controller.js';
import { MomoService } from './momo.service.js';

@Module({
  controllers: [MomoController],
  providers: [MomoService],
  exports: [MomoService],
})
export class MomoModule {}

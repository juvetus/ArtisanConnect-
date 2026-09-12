import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Listing } from '../../entities/index.js';
import { ShopsModule } from '../shops/shops.module.js';
import { ListingsService } from './listings.service.js';
import { ListingsController } from './listings.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Listing]), forwardRef(() => ShopsModule)],
  controllers: [ListingsController],
  providers: [ListingsService],
  exports: [ListingsService],
})
export class ListingsModule {}


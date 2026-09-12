import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Listing, Order, Payment, User } from '../../entities/index.js';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([User, Listing, Order, Payment])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}

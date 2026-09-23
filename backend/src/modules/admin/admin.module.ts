import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstitutionalProgram, InstitutionalResource, Listing, Order, Payment, ProgramApplication, ServiceOrder, Shop, Subscription, User } from '../../entities/index.js';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { ShopsModule } from '../shops/shops.module.js';
import { EmailModule } from '../email/email.module.js';
import { ReportsModule } from '../reports/reports.module.js';
import { InstitutionsModule } from '../institutions/institutions.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([User, Listing, Order, Payment, ServiceOrder, Shop, Subscription, InstitutionalResource, InstitutionalProgram, ProgramApplication]), ShopsModule, EmailModule, ReportsModule, InstitutionsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}

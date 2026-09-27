import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailModule } from '../email/email.module.js';
import { ReportsModule } from '../reports/reports.module.js';
import { Invoice, Order, Payment, User } from '../../entities/index.js';
import { InvoicesService } from './invoices.service.js';
import { InvoicesController } from './invoices.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Invoice, Order, Payment, User]), EmailModule, ReportsModule],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
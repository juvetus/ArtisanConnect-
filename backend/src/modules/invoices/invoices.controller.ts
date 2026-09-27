import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator.js';
import { InvoicesService } from './invoices.service.js';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get('order/:orderId/pdf')
  async orderPdf(@CurrentUser() user: AuthUser, @Param('orderId') orderId: string, @Res() response: Response) {
    const buffer = await this.invoices.getPdfForOrder(orderId, user.id, user.role);
    response.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="invoice-${orderId}.pdf"` });
    response.send(buffer);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.invoices.getForUser(id, user.id, user.role);
  }

  @Get(':id/pdf')
  async pdf(@CurrentUser() user: AuthUser, @Param('id') id: string, @Res() response: Response) {
    const buffer = await this.invoices.getPdf(id, user.id, user.role);
    response.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="invoice-${id}.pdf"` });
    response.send(buffer);
  }
}

import { Controller, Get, Post, Param, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator.js';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Get('order/:orderId')
  async getPaymentByOrder(@CurrentUser() user: AuthUser, @Param('orderId') orderId: string) {
    const payment = await this.paymentsService.findByOrder(orderId);
    if (!payment) throw new NotFoundException('Paiement introuvable');
    if (payment.order.buyerId !== user.id && payment.order.sellerId !== user.id) {
      throw new ForbiddenException('Ce paiement ne vous concerne pas');
    }
    return payment;
  }

  @Post('order/:orderId/confirm-cash')
  async confirmCashPayment(@CurrentUser() user: AuthUser, @Param('orderId') orderId: string) {
    return this.paymentsService.confirmCashPayment(orderId, user.id);
  }

  @Post('order/:orderId/orange-money/confirm-test')
  async confirmOrangeMoneyTest(@CurrentUser() user: AuthUser, @Param('orderId') orderId: string) {
    return this.paymentsService.confirmOrangeMoneyTest(orderId, user.id);
  }
}



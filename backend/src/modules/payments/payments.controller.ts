import { Controller, Get, Post, Param, Body, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { EscrowService } from './escrow.service.js';
import { OrangeMoneyService } from './orange-money.service.js';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator.js';
import { Public } from '../auth/public.decorator.js';

@Controller('payments')
export class PaymentsController {
  constructor(
    private paymentsService: PaymentsService,
    private escrowService: EscrowService,
    private orangeMoneyService: OrangeMoneyService,
  ) {}

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

  // --- Workflow escrow Orange Money ---

  /** Étape 1 — Paiement bloqué (webpayment). */
  @Post('order/:orderId/webpayment')
  async webpayment(@CurrentUser() user: AuthUser, @Param('orderId') orderId: string) {
    return this.escrowService.initiateWebpayment(orderId, user.id);
  }

  /** Étape 2 — Vendeur : produit disponible (ou annulation + remboursement). */
  @Post('order/:orderId/confirm-availability')
  async confirmAvailability(@CurrentUser() user: AuthUser, @Param('orderId') orderId: string) {
    return this.escrowService.confirmAvailability(orderId, user.id);
  }

  @Post('order/:orderId/reject-availability')
  async rejectAvailability(@CurrentUser() user: AuthUser, @Param('orderId') orderId: string) {
    return this.escrowService.rejectAvailability(orderId, user.id);
  }

  /** Étape 3 — Transporteur : récupération + conformité. */
  @Post('order/:orderId/carrier-verify')
  async carrierVerify(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
    @Body() body: { pickedUp: boolean; conform: boolean },
  ) {
    return this.escrowService.carrierVerify(orderId, user.id, body);
  }

  /** Étape 4 — Client : réception confirmée. */
  @Post('order/:orderId/confirm-reception')
  async confirmReception(@CurrentUser() user: AuthUser, @Param('orderId') orderId: string) {
    return this.escrowService.confirmReception(orderId, user.id);
  }

  /** Étape 5 — Libération du paiement (disbursement). */
  @Post('order/:orderId/disbursement')
  async disbursement(@CurrentUser() user: AuthUser, @Param('orderId') orderId: string) {
    return this.escrowService.disburse(orderId, user.id);
  }

  /** Étape 6 — Remboursement. */
  @Post('order/:orderId/refund')
  async refund(@CurrentUser() user: AuthUser, @Param('orderId') orderId: string) {
    return this.escrowService.cancelAndRefund(orderId, 'Remboursement demandé', user.id);
  }

  // --- Endpoints dédiés Orange Money ---

  /** Callback IPN public pour les notifications émises par Orange Money. */
  @Public()
  @Post('orange/callback')
  async orangeCallback(@Body() body: Record<string, unknown>) {
    return this.orangeMoneyService.handleCallback(body);
  }

  /** Vérification du statut direct d'une transaction Orange Money. */
  @Get('orange/status/:orderId')
  async getOrangeStatus(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
  ) {
    const payment = await this.paymentsService.findByOrder(orderId);
    if (!payment) throw new NotFoundException('Paiement introuvable');
    if (payment.order.buyerId !== user.id && payment.order.sellerId !== user.id) {
      throw new ForbiddenException('Accès refusé');
    }
    return this.orangeMoneyService.checkTransactionStatus(
      orderId,
      Number(payment.amount),
      payment.orangeMoneyTransactionId || payment.id,
    );
  }
}



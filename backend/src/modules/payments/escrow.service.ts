import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order, Payment, Listing } from '../../entities/index.js';
import { ShopsService } from '../shops/shops.service.js';
import { OrangeMoneyService } from './orange-money.service.js';

/**
 * Workflow escrow Mobile Money :
 * 1. webpayment  → l'argent du client est bloqué (status PENDING → escrow)
 * 2. confirmation vendeur ("produit disponible") sinon annulation + remboursement
 * 3. vérification transporteur (récupéré + conforme) sinon annulation + remboursement
 * 4. réception confirmée par le client
 * 5. disbursement → libération du paiement vers le vendeur
 * 6. refund      → remboursement automatique en cas de problème
 */
@Injectable()
export class EscrowService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    private dataSource: DataSource,
    private shopsService: ShopsService,
    private orangeMoneyService: OrangeMoneyService,
  ) { }

  /** Étape 1 — Paiement client via Orange Money webpayment. */
  async initiateWebpayment(orderId: string, buyerId: string) {
    const order = await this.ordersRepository.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Commande introuvable');
    if (order.buyerId !== buyerId) throw new ForbiddenException('Cette commande ne vous concerne pas');
    if (order.paymentMethod !== 'orange_money') {
      throw new BadRequestException("Cette commande n'est pas réglée via Orange Money");
    }

    const omResult = await this.orangeMoneyService.initWebPayment({
      orderId,
      amount: Number(order.totalPrice),
      currency: 'XAF',
      orderType: 'product',
      reference: `CMD-${orderId.slice(0, 8)}`,
    });

    return this.dataSource.transaction(async (manager) => {
      const payment = await manager.findOne(Payment, { where: { orderId } });
      if (!payment) throw new NotFoundException('Paiement introuvable');
      if (payment.status !== 'pending') {
        throw new BadRequestException('Ce paiement a déjà été traité');
      }

      payment.orangeMoneyTransactionId = omResult.transactionId;
      payment.orangeMoneyPaymentToken = omResult.paymentToken;
      payment.orangeMoneyNotifToken = omResult.notifToken || null;
      payment.orangeMoneyPaymentUrl = omResult.paymentUrl;
      await manager.save(payment);

      return {
        transactionId: payment.orangeMoneyTransactionId,
        paymentToken: omResult.paymentToken,
        notifToken: omResult.notifToken,
        paymentUrl: omResult.paymentUrl,
        status: 'PENDING' as const,
      };
    });
  }

  async handleOrangeCallback(body: Record<string, unknown>) {
    const orderId = String(body.order_id || body.orderId || '').trim();
    if (!orderId) throw new BadRequestException('order_id Orange Money absent');

    return this.dataSource.transaction(async (manager) => {
      const payment = await manager.findOne(Payment, { where: { orderId } });
      if (!payment) throw new NotFoundException('Paiement Orange Money introuvable');

      const callback = await this.orangeMoneyService.handleCallback(body, payment.orangeMoneyNotifToken);
      payment.orangeMoneyTransactionId = callback.transactionId || payment.orangeMoneyTransactionId;

      if (callback.status === 'SUCCESS') {
        payment.status = 'confirmed';
        await manager.save(payment);
        await manager.update(Order, orderId, { status: 'confirmed' });
        return { success: true, orderId, status: 'SUCCESS', transactionId: payment.orangeMoneyTransactionId };
      }

      payment.status = 'pending';
      await manager.save(payment);
      return { success: true, orderId, status: 'FAILED', transactionId: payment.orangeMoneyTransactionId };
    });
  }

  /** Étape 2 — Le vendeur confirme que le produit est disponible. */
  async confirmAvailability(orderId: string, sellerId: string): Promise<Order> {
    const order = await this.getEscrowOrder(orderId, sellerId, 'seller');
    if (order.status !== 'pending' && order.status !== 'confirmed') {
      throw new BadRequestException('Cette commande ne peut plus être confirmée');
    }
    await this.ordersRepository.update(orderId, { sellerConfirmedAvailability: true, status: 'confirmed' });
    return this.ordersRepository.findOneOrFail({ where: { id: orderId } });
  }

  /** Étape 2bis — Produit indisponible : annulation + remboursement automatique. */
  async rejectAvailability(orderId: string, sellerId: string) {
    const order = await this.getEscrowOrder(orderId, sellerId, 'seller');
    if (order.status === 'completed') {
      throw new BadRequestException('Cette commande est déjà terminée');
    }
    return this.cancelAndRefund(orderId, 'Produit indisponible — vendeur', sellerId);
  }

  /** Étape 3 — Le transporteur confirme récupération + conformité. */
  async carrierVerify(orderId: string, carrierId: string, data: { pickedUp: boolean; conform: boolean }) {
    const order = await this.getEscrowOrder(orderId, carrierId, 'carrier');
    if (!order.sellerConfirmedAvailability) {
      throw new BadRequestException('Le vendeur doit confirmer la disponibilité avant le retrait');
    }
    if (!data.pickedUp || !data.conform) {
      // Produit refusé par le transporteur : annulation, remboursement, vendeur bloqué.
      await this.ordersRepository.update(orderId, {
        carrierId,
        cancellationReason: 'Produit non conforme au retrait',
      });
      await this.cancelAndRefund(orderId, 'Produit non conforme — transporteur', carrierId);
      return { refunded: true as const };
    }
    await this.ordersRepository.update(orderId, {
      carrierId,
      carrierPickedUp: true,
      carrierVerified: true,
    });
    return { refunded: false as const };
  }

  /** Étape 4 — Le client confirme la réception du produit. */
  async confirmReception(orderId: string, buyerId: string): Promise<Order> {
    const order = await this.getEscrowOrder(orderId, buyerId, 'buyer');
    if (order.deliveryMethod === 'carrier' && !order.carrierVerified) {
      throw new BadRequestException('Le transporteur doit vérifier le produit avant la réception');
    }
    await this.ordersRepository.update(orderId, { buyerConfirmedReception: true });
    return this.ordersRepository.findOneOrFail({ where: { id: orderId } });
  }

  /** Étape 5 — Libération du paiement vers le vendeur (disbursement). */
  async disburse(orderId: string, requesterId: string) {
    const order = await this.ordersRepository.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Commande introuvable');
    if (order.buyerId !== requesterId && order.sellerId !== requesterId) {
      throw new ForbiddenException('Cette commande ne vous concerne pas');
    }
    if (!order.buyerConfirmedReception) {
      throw new BadRequestException('Le client doit confirmer la réception avant le versement');
    }

    return this.dataSource.transaction(async (manager) => {
      const payment = await manager.findOne(Payment, { where: { orderId } });
      if (!payment) throw new NotFoundException('Paiement introuvable');
      if (payment.status === 'refunded') throw new BadRequestException('Ce paiement a été remboursé');
      if (payment.status === 'captured') return payment;

      // Intégration réelle : POST /v1/disbursement vers le numéro Mobile Money du vendeur.
      payment.status = 'captured';
      await manager.save(payment);
      await manager.update(Order, orderId, { status: 'completed' });
      await this.shopsService.recordSuccessfulSale(order.sellerId);
      return payment;
    });
  }

  /** Étape 6 — Remboursement (produit indisponible, non conforme, vendeur muet…). */
  async cancelAndRefund(orderId: string, reason: string, requesterId?: string) {
    const order = await this.ordersRepository.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Commande introuvable');
    if (order.status === 'completed') {
      throw new BadRequestException('Une commande terminée ne peut pas être remboursée');
    }
    if (requesterId && order.sellerId === requesterId) {
      // Le vendeur qui annule après avoir encaissé est considéré fautif (fraude).
      await this.shopsService.setActiveSellerShopsSuspended(order.sellerId);
    }

    return this.dataSource.transaction(async (manager) => {
      // Intégration réelle : POST /v1/refund Orange Money.
      await manager.update(Payment, { orderId }, { status: 'refunded' });
      await manager.increment(Listing, { id: order.listingId }, 'stock', order.quantity);
      await manager.update(Order, orderId, { status: 'cancelled', cancellationReason: reason });
      return { refunded: true as const, reason };
    });
  }

  private async getEscrowOrder(orderId: string, userId: string, role: 'seller' | 'buyer' | 'carrier') {
    const order = await this.ordersRepository.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Commande introuvable');
    if (order.paymentMethod !== 'orange_money' && order.paymentMethod !== 'momo') {
      throw new BadRequestException('Ce workflow concerne uniquement les paiements Mobile Money');
    }
    if (role === 'seller' && order.sellerId !== userId) {
      throw new ForbiddenException('Seul le vendeur peut effectuer cette action');
    }
    if (role === 'buyer' && order.buyerId !== userId) {
      throw new ForbiddenException('Seul le client peut effectuer cette action');
    }
    // Transporteur : tout utilisateur authentifié distinct de l'acheteur et du vendeur (phase 1).
    if (role === 'carrier' && (order.buyerId === userId || order.sellerId === userId)) {
      throw new ForbiddenException('Un tiers doit vérifier le produit');
    }
    return order;
  }
}

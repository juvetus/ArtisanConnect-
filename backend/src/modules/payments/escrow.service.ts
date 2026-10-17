import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomBytes } from 'node:crypto';
import { Order, Payment, Listing } from '../../entities/index.js';
import { ShopsService } from '../shops/shops.service.js';
import { OrangeMoneyService } from './orange-money.service.js';
import { IwomipayService, type IwomipayCardDetails, type IwomipayMethod, type IwomipayPaymentResult } from './iwomipay.service.js';
import { calculateCollectedPlatformCommission } from './platform-commission.js';
import { InvoicesService } from '../invoices/invoices.service.js';

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
    private iwomipayService: IwomipayService,
    private invoicesService: InvoicesService,
  ) { }

  /** Étape 1 — Initialisation d'un paiement Mobile Money ou carte via Iwomipay. */
  async initiateIwomipayPayment(
    orderId: string,
    buyerId: string,
    method: IwomipayMethod,
    payerPhone?: string,
    cardDetails?: IwomipayCardDetails,
  ) {
    const order = await this.ordersRepository.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Commande introuvable');
    if (order.buyerId !== buyerId) throw new ForbiddenException('Cette commande ne vous concerne pas');
    if (order.paymentMethod !== method) {
      throw new BadRequestException('Le moyen de paiement ne correspond pas à cette commande');
    }
    if (order.status === 'cancelled') throw new BadRequestException('Cette commande a été annulée');
    if (!payerPhone?.trim()) throw new BadRequestException('Le numéro Orange Money du payeur est obligatoire');

    const payment = await this.dataSource.getRepository(Payment).findOne({ where: { orderId } });
    if (!payment) throw new NotFoundException('Paiement introuvable');
    if (payment.status !== 'pending') throw new BadRequestException('Ce paiement a déjà été traité');
    if (payment.iwomipayExternalId && payment.iwomipayInternalId) {
      const previousResult = await this.iwomipayService.checkTransactionStatus(
        payment.iwomipayInternalId,
        payment.iwomipayExternalId,
      );
      if (previousResult.status === 'PENDING') {
        return {
          externalId: previousResult.externalId,
          internalId: previousResult.internalId,
          redirectUrl: payment.iwomipayRedirectUrl,
          status: previousResult.status,
          message: previousResult.message,
        };
      }
      if (previousResult.status === 'SUCCESS') {
        return this.applyIwomipayStatus(orderId, payment.iwomipayInternalId, previousResult);
      }
      payment.iwomipayExternalId = null;
      payment.iwomipayInternalId = null;
      payment.iwomipayRedirectUrl = null;
      await this.dataSource.getRepository(Payment).save(payment);
    }

    const externalId = payment.iwomipayExternalId || randomBytes(8).toString('hex');
    if (!payment.iwomipayExternalId) {
      payment.iwomipayExternalId = externalId;
      await this.dataSource.getRepository(Payment).save(payment);
    }
    const iwomiResult = await this.iwomipayService.initiatePayment({
      amount: Number(order.totalPrice),
      externalId,
      method,
      payerPhone,
      motif: `ArtisanConnect ${orderId.slice(0, 8)}`,
      cardDetails,
    });
    if (iwomiResult.externalId !== externalId) {
      throw new BadRequestException('La référence de transaction retournée par Iwomipay ne correspond pas');
    }
    if (iwomiResult.status === 'FAILED') {
      throw new BadRequestException(iwomiResult.message || 'Iwomipay a refusé le paiement');
    }

    await this.dataSource.transaction(async (manager) => {
      const currentPayment = await manager.findOne(Payment, { where: { orderId } });
      if (!currentPayment) throw new NotFoundException('Paiement introuvable');
      if (currentPayment.status !== 'pending') throw new BadRequestException('Ce paiement a déjà été traité');
      if (currentPayment.iwomipayExternalId !== externalId) {
        throw new BadRequestException('La transaction Iwomipay de cette commande a changé');
      }

      currentPayment.iwomipayExternalId = iwomiResult.externalId;
      currentPayment.iwomipayInternalId = iwomiResult.internalId;
      currentPayment.iwomipayRedirectUrl = iwomiResult.redirectUrl || null;
      if (iwomiResult.status === 'SUCCESS') currentPayment.status = 'confirmed';
      await manager.save(currentPayment);
      if (iwomiResult.status === 'SUCCESS') {
        await manager.update(Order, orderId, { status: 'confirmed' });
      }
    });
    if (iwomiResult.status === 'SUCCESS') await this.invoicesService.issueForOrder(orderId);

    return {
      externalId: iwomiResult.externalId,
      internalId: iwomiResult.internalId,
      redirectUrl: iwomiResult.redirectUrl || null,
      status: iwomiResult.status,
      message: iwomiResult.message,
    };
  }

  async initiateWebpayment(orderId: string, buyerId: string, payerPhone?: string) {
    return this.initiateIwomipayPayment(orderId, buyerId, 'orange_money', payerPhone);
  }

  async checkIwomipayStatus(orderId: string, requesterId: string) {
    const order = await this.ordersRepository.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Commande introuvable');
    if (order.buyerId !== requesterId && order.sellerId !== requesterId) {
      throw new ForbiddenException('Cette commande ne vous concerne pas');
    }
    const payment = await this.dataSource.getRepository(Payment).findOne({ where: { orderId } });
    if (!payment) throw new NotFoundException('Paiement introuvable');
    if (!payment.iwomipayExternalId || !payment.iwomipayInternalId) {
      throw new BadRequestException('Aucune transaction Iwomipay n’est associée à ce paiement');
    }
    if (payment.status === 'refunded') throw new BadRequestException('Ce paiement a été remboursé');

    const result = await this.iwomipayService.checkTransactionStatus(
      payment.iwomipayInternalId,
      payment.iwomipayExternalId,
    );
    return this.applyIwomipayStatus(orderId, payment.iwomipayInternalId, result);
  }

  async handleIwomipayCallback(body: Record<string, unknown>) {
    const externalId = String(body.external_id || '').trim();
    const internalId = String(body.internal_id || '').trim();
    if (!externalId || !internalId) {
      throw new BadRequestException('Références de transaction Iwomipay absentes');
    }
    const payment = await this.dataSource.getRepository(Payment).findOne({ where: { iwomipayExternalId: externalId } });
    if (!payment || payment.iwomipayInternalId !== internalId) {
      throw new NotFoundException('Transaction Iwomipay introuvable');
    }

    const result = await this.iwomipayService.checkTransactionStatus(internalId, externalId);
    return this.applyIwomipayStatus(payment.orderId, internalId, result);
  }

  private async applyIwomipayStatus(orderId: string, internalId: string, result: IwomipayPaymentResult) {
    const payment = await this.dataSource.transaction(async (manager) => {
      const currentPayment = await manager.findOne(Payment, { where: { orderId } });
      if (!currentPayment || currentPayment.iwomipayInternalId !== internalId) {
        throw new NotFoundException('Transaction Iwomipay introuvable');
      }
      if (currentPayment.status === 'refunded') throw new BadRequestException('Ce paiement a été remboursé');
      if (result.status === 'SUCCESS' && currentPayment.status === 'pending') {
        currentPayment.status = 'confirmed';
        await manager.save(currentPayment);
        await manager.update(Order, orderId, { status: 'confirmed' });
      }
      return currentPayment;
    });

    if (result.status === 'SUCCESS') await this.invoicesService.issueForOrder(orderId);
    return {
      success: true,
      orderId,
      externalId: result.externalId,
      internalId: result.internalId,
      redirectUrl: payment.iwomipayRedirectUrl,
      status: result.status,
      paymentStatus: payment.status,
      message: result.message,
    };
  }

  async handleOrangeCallback(body: Record<string, unknown>) {
    const orderId = String(body.order_id || body.orderId || '').trim();
    if (!orderId) throw new BadRequestException('order_id Orange Money absent');

    const result = await this.dataSource.transaction(async (manager) => {
      const payment = await manager.findOne(Payment, { where: { orderId } });
      if (!payment) throw new NotFoundException('Paiement Orange Money introuvable');
      if (payment.iwomipayExternalId || payment.iwomipayInternalId) {
        throw new BadRequestException('Cette transaction doit être confirmée par le callback Iwomipay');
      }
      if (!payment.orangeMoneyNotifToken) {
        throw new BadRequestException('Aucun jeton de notification Orange Money n’est associé à ce paiement');
      }

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

    if (result.status === 'SUCCESS') await this.invoicesService.issueForOrder(orderId);
    return result;
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
      if (payment.status !== 'confirmed') throw new BadRequestException('Le paiement doit être confirmé avant le versement');

      // Intégration réelle : POST /v1/disbursement vers le numéro Mobile Money du vendeur.
      const platformFee = calculateCollectedPlatformCommission(Number(order.totalPrice), payment.method);
      payment.status = 'captured';
      await manager.save(payment);
      await manager.update(Order, orderId, { status: 'completed', platformFee });
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
    if (!['orange_money', 'momo', 'card'].includes(order.paymentMethod)) {
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

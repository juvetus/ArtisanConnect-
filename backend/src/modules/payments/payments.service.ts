import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order, Payment } from '../../entities/index.js';
import { MomoService } from '../momo/momo.service.js';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
    private dataSource: DataSource,
    private momoService: MomoService,
  ) {}

  async findByOrder(orderId: string): Promise<Payment | null> {
    return this.paymentsRepository.findOne({
      where: { orderId },
      relations: { order: true },
    });
  }

  async initiateMomoPayment(orderId: string, buyerId: string, payerPhone?: string): Promise<Payment & { redirectUrl?: string | null; paymentReference?: string | null }> {
    const normalizedPhone = this.normalizeMomoPhone(payerPhone);

    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, { where: { id: orderId } });
      if (!order) throw new NotFoundException('Commande introuvable');
      if (order.buyerId !== buyerId) {
        throw new ForbiddenException('Seul l’acheteur peut initier ce paiement');
      }
      if (order.status === 'cancelled') {
        throw new BadRequestException('Cette commande a été annulée');
      }
      if (order.paymentMethod !== 'momo') {
        throw new BadRequestException('Cette commande n’utilise pas le paiement MoMo');
      }

      let payment = await manager.findOne(Payment, { where: { orderId } });
      if (!payment) {
        payment = manager.create(Payment, {
          orderId,
          amount: Number(order.totalPrice),
          method: 'momo',
          status: 'pending',
        });
        payment = await manager.save(payment);
      }

      const result = await this.momoService.initiateCollectionPayment({
        orderId,
        amount: Number(payment.amount),
        currency: 'XAF',
        externalId: `ORDER-${payment.orderId}`,
        payerPhone: normalizedPhone,
        callbackUrl: this.momoService.getWebhookUrl('payments/momo/webhook'),
        payerMessage: 'Paiement commande ArtisanConnect',
        payeeNote: `Commande ${order.id}`,
      });

      if (result.referenceId) {
        payment.orangeMoneyTransactionId = result.referenceId;
        if (result.status === 'SUCCESS') {
          payment.status = 'confirmed';
          await manager.update(Order, orderId, { status: 'confirmed' });
        } else if (result.status === 'FAILED') {
          payment.status = 'pending';
        }
        await manager.save(payment);
      }

      return Object.assign(payment, {
        paymentReference: result.referenceId || payment.orangeMoneyTransactionId || null,
        redirectUrl: result.redirectUrl || null,
      });
    });
  }

  private normalizeMomoPhone(phone?: string): string {
    const normalized = String(phone || '').replace(/[\s().-]/g, '');
    if (!/^\+?\d{8,15}$/.test(normalized)) {
      throw new BadRequestException('Numéro MoMo invalide');
    }
    return normalized;
  }

  async confirmMomoPayment(orderId: string, buyerId: string): Promise<Payment> {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, { where: { id: orderId } });
      if (!order) throw new NotFoundException('Commande introuvable');
      if (order.buyerId !== buyerId) {
        throw new ForbiddenException('Seul l’acheteur peut confirmer ce paiement');
      }
      if (order.status === 'cancelled') {
        throw new BadRequestException('Cette commande a été annulée');
      }

      const payment = await manager.findOne(Payment, { where: { orderId } });
      if (!payment) throw new NotFoundException('Paiement introuvable');
      if (payment.status !== 'pending') return payment;

      const result = await this.momoService.getPaymentStatus(payment.orangeMoneyTransactionId || `ORDER-${orderId}`);

      if (result.status === 'SUCCESS') {
        payment.status = 'confirmed';
        payment.orangeMoneyTransactionId = result.referenceId || payment.orangeMoneyTransactionId || `MOMO-${Date.now()}`;
        await manager.save(payment);
        await manager.update(Order, orderId, { status: 'confirmed' });
        return payment;
      }

      if (result.status === 'FAILED') {
        payment.status = 'pending';
        await manager.save(payment);
      }

      return payment;
    });
  }

  /**
   * L'artisan atteste avoir reçu les espèces : le paiement est confirmé
   * et la commande passée à « terminée » dans la même transaction.
   */
  async confirmCashPayment(orderId: string, sellerId: string): Promise<Payment> {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, { where: { id: orderId } });
      if (!order) throw new NotFoundException('Commande introuvable');
      if (order.sellerId !== sellerId) {
        throw new ForbiddenException("Seul l'artisan vendeur peut confirmer l'encaissement");
      }
      if (order.status === 'cancelled') {
        throw new BadRequestException('Cette commande a été annulée');
      }

      const payment = await manager.findOne(Payment, { where: { orderId } });
      if (!payment) throw new NotFoundException('Paiement introuvable');
      if (payment.method !== 'cash') {
        throw new BadRequestException('Ce paiement ne se règle pas en espèces');
      }

      payment.status = 'confirmed';
      payment.cashConfirmedAt = new Date();
      await manager.save(payment);
      await manager.update(Order, orderId, { status: 'completed' });

      return payment;
    });
  }

  async confirmOrangeMoneyTest(orderId: string, buyerId: string): Promise<Payment> {
    if (process.env.NODE_ENV === 'production' || process.env.ORANGE_MONEY_MODE !== 'mock') {
      throw new ForbiddenException('La confirmation mock Orange Money est désactivée');
    }

    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, { where: { id: orderId } });
      if (!order) throw new NotFoundException('Commande introuvable');
      if (order.buyerId !== buyerId) {
        throw new ForbiddenException('Seul l\'acheteur peut confirmer ce paiement de test');
      }
      if (order.paymentMethod !== 'orange_money') {
        throw new BadRequestException('Cette commande n\'utilise pas Orange Money');
      }
      if (order.status === 'cancelled') {
        throw new BadRequestException('Cette commande a été annulée');
      }

      const payment = await manager.findOne(Payment, { where: { orderId } });
      if (!payment) throw new NotFoundException('Paiement introuvable');
      if (payment.status !== 'pending') return payment;

      payment.status = 'confirmed';
      payment.orangeMoneyTransactionId = `OM-TEST-${Date.now()}`;
      await manager.save(payment);
      await manager.update(Order, orderId, { status: 'confirmed' });
      return payment;
    });
  }

  async handleMomoWebhook(body: Record<string, unknown>): Promise<{ success: boolean; message: string }> {
    const payload = this.momoService.handleWebhook(body);
    const externalId = String(payload.externalId || payload.referenceId || '').trim();
    const status = payload.status;

    if (!externalId) {
      return { success: false, message: 'Identifiant externe MoMo absent' };
    }

    const orderId = externalId.startsWith('ORDER-') ? externalId.replace('ORDER-', '') : externalId;
    const payment = await this.paymentsRepository.findOne({ where: { orderId } });
    if (!payment) {
      return { success: false, message: `Paiement introuvable pour la commande ${orderId}` };
    }

    if (status === 'SUCCESS') {
      payment.status = 'confirmed';
      payment.orangeMoneyTransactionId = String(payload.transactionId || payload.referenceId || payment.orangeMoneyTransactionId || `MOMO-${Date.now()}`);
      await this.paymentsRepository.save(payment);
      await this.dataSource.manager.update(Order, orderId, { status: 'confirmed' });
      return { success: true, message: 'Paiement MoMo validé' };
    }

    if (status === 'FAILED' || status === 'EXPIRED') {
      payment.status = 'pending';
      await this.paymentsRepository.save(payment);
      return { success: true, message: 'Paiement MoMo refusé' };
    }

    return { success: true, message: 'Webhook MoMo reçu en attente' };
  }
}



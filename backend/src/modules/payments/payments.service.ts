import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order, Payment } from '../../entities/index.js';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
    private dataSource: DataSource,
  ) {}

  async findByOrder(orderId: string): Promise<Payment | null> {
    return this.paymentsRepository.findOne({
      where: { orderId },
      relations: { order: true },
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
}



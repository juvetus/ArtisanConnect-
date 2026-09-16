import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Listing, Order, Payment } from '../../entities/index.js';
import { NotificationsService } from '../notifications/notifications.service.js';

/** Commission prélevée par la plateforme sur chaque commande. */
const PLATFORM_FEE_RATE = 0.10;

interface ProductOrderDeliveryInput {
  deliveryMethod: 'workshop' | 'home' | 'carrier';
  deliveryAddress?: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    private dataSource: DataSource,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Crée la commande et son paiement en espèces, et décrémente le stock.
   * Les montants sont calculés ici : ils ne sont jamais acceptés depuis le client.
   */
  async placeOrder(
    buyerId: string,
    listingId: string,
    quantity: number,
    paymentMethod: 'cash' | 'momo' | 'orange_money' = 'cash',
    delivery: ProductOrderDeliveryInput = { deliveryMethod: 'workshop' },
  ): Promise<Order> {
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new BadRequestException('Quantité invalide');
    }
    if (!['workshop', 'home', 'carrier'].includes(delivery.deliveryMethod)) {
      throw new BadRequestException('Mode de livraison invalide');
    }
    if (delivery.deliveryMethod !== 'workshop' && !delivery.deliveryAddress?.trim()) {
      throw new BadRequestException('Une adresse est obligatoire pour ce mode de livraison');
    }

    return this.dataSource.transaction(async (manager) => {
      const listing = await manager.findOne(Listing, {
        where: { id: listingId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!listing) throw new NotFoundException('Annonce introuvable');
      if (listing.status !== 'active') throw new BadRequestException("Cette annonce n'est plus disponible");
      if (listing.sellerId === buyerId) {
        throw new ForbiddenException('Vous ne pouvez pas commander votre propre annonce');
      }
      if (listing.stock < quantity) {
        throw new BadRequestException(`Stock insuffisant : ${listing.stock} disponible(s)`);
      }

      const acceptedPayments = listing.acceptedPaymentMethods?.length ? listing.acceptedPaymentMethods : ['cash', 'momo', 'orange_money'];
      const acceptedDeliveries = listing.deliveryMethods?.length ? listing.deliveryMethods : ['workshop', 'home', 'carrier'];
      if (!acceptedPayments.includes(paymentMethod)) throw new BadRequestException('Ce mode de paiement n’est pas accepté pour cette annonce');
      if (!acceptedDeliveries.includes(delivery.deliveryMethod)) throw new BadRequestException('Ce mode de livraison n’est pas proposé pour cette annonce');

      const unitPrice = Number(listing.price);
      const totalPrice = Math.round(unitPrice * quantity);

      await manager.decrement(Listing, { id: listing.id }, 'stock', quantity);

      const order = await manager.save(
        manager.create(Order, {
          buyerId,
          sellerId: listing.sellerId,
          listingId: listing.id,
          quantity,
          totalPrice,
          platformFee: Math.round(totalPrice * PLATFORM_FEE_RATE),
          status: 'pending',
          paymentMethod,
          deliveryMethod: delivery.deliveryMethod,
          deliveryAddress: delivery.deliveryMethod !== 'workshop' ? delivery.deliveryAddress!.trim() : null,
          deliveryLatitude: delivery.deliveryMethod !== 'workshop' ? delivery.deliveryLatitude ?? null : null,
          deliveryLongitude: delivery.deliveryMethod !== 'workshop' ? delivery.deliveryLongitude ?? null : null,
          deliveryStatus: 'pending',
        }),
      );

      await manager.save(
        manager.create(Payment, {
          orderId: order.id,
          amount: totalPrice,
          method: paymentMethod,
          status: 'pending',
        }),
      );

      // Notification du vendeur : nouvelle commande reçue.
      // Hors transaction : une erreur de notification ne doit pas annuler la commande.
      try {
        await this.notificationsService.notify({
          recipientId: order.sellerId,
          type: 'new_order',
          title: 'Nouvelle commande !',
          content: `Vous avez reçu une nouvelle commande de ${order.quantity} article(s) pour un montant de ${totalPrice} FCFA. Confirmez la disponibilité du produit.`,
          link: '/dashboard',
          relatedId: order.id,
        });
      } catch {
        // La notification ne doit jamais bloquer la commande.
      }

      return order;
    });
  }

  async findById(id: string): Promise<Order | null> {
    return this.ordersRepository.findOne({
      where: { id },
      relations: { buyer: true, seller: true, listing: true, payment: true },
    });
  }

  async findByBuyer(buyerId: string, skip = 0, take = 20): Promise<[Order[], number]> {
    return this.ordersRepository.findAndCount({
      where: { buyerId },
      relations: { seller: true, listing: true, payment: true },
      skip,
      take,
    });
  }

  async findBySeller(sellerId: string, skip = 0, take = 20): Promise<[Order[], number]> {
    return this.ordersRepository.findAndCount({
      where: { sellerId },
      relations: { buyer: true, listing: true, payment: true },
      skip,
      take,
    });
  }

  async updateStatus(
    id: string,
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled',
  ): Promise<Order | null> {
    await this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, { where: { id } });
      if (!order) throw new NotFoundException('Commande introuvable');
      if (order.status === status) return;

      if (order.status === 'completed' && status !== 'completed') {
        throw new BadRequestException('Une commande terminée ne peut plus changer de statut');
      }

      // Annuler libère le stock réservé lors de la commande.
      if (status === 'cancelled' && order.status !== 'cancelled') {
        await manager.increment(Listing, { id: order.listingId }, 'stock', order.quantity);
      }

      await manager.update(Order, id, { status });
    });

    return this.findById(id);
  }
}



import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Listing, ListingOffer, Order, Payment } from '../../entities/index.js';
import { isDemoMode } from '../../demo-mode.js';
import { NotificationsService } from '../notifications/notifications.service.js';

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
    @InjectRepository(ListingOffer)
    private offersRepository: Repository<ListingOffer>,
    private dataSource: DataSource,
    private notificationsService: NotificationsService,
  ) {}

  async createListingOffer(buyerId: string, data: {
    listingId: string;
    quantity: number;
    offeredUnitPrice: number;
    message?: string;
    paymentMethod: 'cash' | 'momo' | 'orange_money';
    deliveryMethod: 'workshop' | 'home' | 'carrier';
    deliveryAddress?: string;
  }): Promise<ListingOffer> {
    if (isDemoMode()) throw new ForbiddenException('Les offres sont désactivées en mode démonstration');
    if (!Number.isInteger(data.quantity) || data.quantity < 1) throw new BadRequestException('Quantité invalide');
    if (!Number.isInteger(data.offeredUnitPrice) || data.offeredUnitPrice < 1) throw new BadRequestException('Le prix proposé doit être un montant entier positif en FCFA');
    if (!['cash', 'momo', 'orange_money'].includes(data.paymentMethod)) throw new BadRequestException('Mode de paiement invalide');
    if (!['workshop', 'home', 'carrier'].includes(data.deliveryMethod)) throw new BadRequestException('Mode de livraison invalide');
    if (data.deliveryMethod !== 'workshop' && !data.deliveryAddress?.trim()) throw new BadRequestException('Une adresse est obligatoire pour ce mode de livraison');
    if (data.message && data.message.length > 500) throw new BadRequestException('Le message ne peut pas dépasser 500 caractères');

    const listing = await this.dataSource.getRepository(Listing).findOne({ where: { id: data.listingId } });
    if (!listing) throw new NotFoundException('Annonce introuvable');
    if (listing.isDemo || listing.status !== 'active') throw new BadRequestException('Cette annonce n’accepte pas les offres');
    if (listing.sellerId === buyerId) throw new ForbiddenException('Vous ne pouvez pas faire une offre sur votre propre annonce');
    if (listing.stock < data.quantity) throw new BadRequestException(`Stock insuffisant : ${listing.stock} disponible(s)`);

    const acceptedPayments = listing.acceptedPaymentMethods?.length ? listing.acceptedPaymentMethods : ['cash', 'momo', 'orange_money'];
    const acceptedDeliveries = listing.deliveryMethods?.length ? listing.deliveryMethods : ['workshop', 'home', 'carrier'];
    if (!acceptedPayments.includes(data.paymentMethod)) throw new BadRequestException('Ce mode de paiement n’est pas accepté pour cette annonce');
    if (!acceptedDeliveries.includes(data.deliveryMethod)) throw new BadRequestException('Ce mode de livraison n’est pas proposé pour cette annonce');

    const offer = await this.offersRepository.save(this.offersRepository.create({
      buyerId,
      sellerId: listing.sellerId,
      listingId: listing.id,
      quantity: data.quantity,
      offeredUnitPrice: data.offeredUnitPrice,
      message: data.message?.trim() || null,
      status: 'pending',
      lastProposedBy: 'buyer',
      negotiationHistory: [{ proposedBy: 'buyer', unitPrice: data.offeredUnitPrice, message: data.message?.trim() || null, createdAt: new Date().toISOString() }],
      paymentMethod: data.paymentMethod,
      deliveryMethod: data.deliveryMethod,
      deliveryAddress: data.deliveryMethod === 'workshop' ? null : data.deliveryAddress!.trim(),
      orderId: null,
    }));

    try {
      await this.notificationsService.notify({
        recipientId: offer.sellerId,
        type: 'new_order',
        title: 'Nouvelle offre sur une annonce',
        content: `Un acheteur propose ${offer.offeredUnitPrice} FCFA par article pour « ${listing.title} » (${offer.quantity} article(s)).`,
        link: '/dashboard',
        relatedId: offer.id,
      });
    } catch {
      // Une notification indisponible ne doit pas faire échouer l’offre.
    }
    return offer;
  }

  async getBuyerListingOffers(buyerId: string): Promise<ListingOffer[]> {
    return this.offersRepository.find({ where: { buyerId }, relations: { listing: true, seller: true }, order: { createdAt: 'DESC' } });
  }

  async getSellerListingOffers(sellerId: string): Promise<ListingOffer[]> {
    return this.offersRepository.find({ where: { sellerId }, relations: { listing: true, buyer: true }, order: { createdAt: 'DESC' } });
  }

  async counterListingOffer(actorId: string, offerId: string, data: { unitPrice: number; message?: string }): Promise<ListingOffer> {
    if (!Number.isInteger(data.unitPrice) || data.unitPrice < 1) throw new BadRequestException('Le prix proposé doit être un montant entier positif en FCFA');
    if (data.message && data.message.length > 500) throw new BadRequestException('Le message ne peut pas dépasser 500 caractères');

    const counter = await this.dataSource.transaction(async (manager) => {
      const offer = await manager.findOne(ListingOffer, { where: { id: offerId }, lock: { mode: 'pessimistic_write' } });
      if (!offer) throw new NotFoundException('Offre introuvable');
      if (offer.status !== 'pending') throw new BadRequestException('Cette négociation est terminée');
      const proposer = actorId === offer.buyerId ? 'buyer' : actorId === offer.sellerId ? 'seller' : null;
      if (!proposer) throw new ForbiddenException('Cette offre ne vous concerne pas');
      if (proposer === offer.lastProposedBy) throw new BadRequestException('Attendez la réponse de l’autre partie avant de proposer un nouveau prix');

      const message = data.message?.trim() || null;
      offer.offeredUnitPrice = data.unitPrice;
      offer.message = message;
      offer.lastProposedBy = proposer;
      offer.negotiationHistory = [...(offer.negotiationHistory ?? []), {
        proposedBy: proposer,
        unitPrice: data.unitPrice,
        message,
        createdAt: new Date().toISOString(),
      }];
      return manager.save(offer);
    });

    try {
      const recipientId = actorId === counter.buyerId ? counter.sellerId : counter.buyerId;
      await this.notificationsService.notify({
        recipientId,
        type: 'order_status',
        title: 'Nouvelle contre-proposition sur une annonce',
        content: `Une nouvelle proposition de ${data.unitPrice} FCFA par article vous attend.`,
        link: actorId === counter.buyerId ? '/dashboard' : '/orders',
        relatedId: counter.id,
      });
    } catch {
      // Une notification indisponible ne doit pas faire échouer la contre-proposition.
    }
    return counter;
  }

  async acceptListingOffer(actorId: string, offerId: string): Promise<Order> {
    if (isDemoMode()) throw new ForbiddenException('Les offres sont désactivées en mode démonstration');
    const order = await this.dataSource.transaction(async (manager) => {
      const offer = await manager.findOne(ListingOffer, { where: { id: offerId }, lock: { mode: 'pessimistic_write' } });
      if (!offer) throw new NotFoundException('Offre introuvable');
      if (offer.status !== 'pending') throw new BadRequestException('Cette négociation est terminée');
      const accepter = actorId === offer.buyerId ? 'buyer' : actorId === offer.sellerId ? 'seller' : null;
      if (!accepter) throw new ForbiddenException('Cette offre ne vous concerne pas');
      if (accepter === offer.lastProposedBy) throw new BadRequestException('Vous ne pouvez pas accepter votre propre proposition');

      const listing = await manager.findOne(Listing, { where: { id: offer.listingId }, lock: { mode: 'pessimistic_write' } });
      if (!listing || listing.isDemo || listing.status !== 'active') throw new BadRequestException('Cette annonce n’est plus disponible');
      if (listing.stock < offer.quantity) throw new BadRequestException(`Stock insuffisant : ${listing.stock} disponible(s)`);
      const acceptedPayments = listing.acceptedPaymentMethods?.length ? listing.acceptedPaymentMethods : ['cash', 'momo', 'orange_money'];
      const acceptedDeliveries = listing.deliveryMethods?.length ? listing.deliveryMethods : ['workshop', 'home', 'carrier'];
      if (!acceptedPayments.includes(offer.paymentMethod)) throw new BadRequestException('Le mode de paiement choisi n’est plus accepté pour cette annonce');
      if (!acceptedDeliveries.includes(offer.deliveryMethod)) throw new BadRequestException('Le mode de livraison choisi n’est plus proposé pour cette annonce');

      await manager.decrement(Listing, { id: listing.id }, 'stock', offer.quantity);
      const totalPrice = Math.round(Number(offer.offeredUnitPrice) * offer.quantity);
      const createdOrder = await manager.save(manager.create(Order, {
        buyerId: offer.buyerId,
        sellerId: offer.sellerId,
        listingId: listing.id,
        quantity: offer.quantity,
        totalPrice,
        platformFee: 0,
        status: 'pending',
        paymentMethod: offer.paymentMethod,
        deliveryMethod: offer.deliveryMethod,
        deliveryAddress: offer.deliveryAddress,
        deliveryLatitude: null,
        deliveryLongitude: null,
        deliveryStatus: 'pending',
      }));
      await manager.save(manager.create(Payment, { orderId: createdOrder.id, amount: totalPrice, method: offer.paymentMethod, status: 'pending' }));
      await manager.update(ListingOffer, offer.id, { status: 'accepted', orderId: createdOrder.id });
      return createdOrder;
    });

    try {
      const recipientId = actorId === order.buyerId ? order.sellerId : order.buyerId;
      await this.notificationsService.notify({
        recipientId,
        type: 'order_status',
        title: 'Le prix convenu a été accepté',
        content: `La négociation est terminée. Une commande a été créée pour ${order.totalPrice} FCFA.`,
        link: recipientId === order.buyerId ? '/orders' : '/dashboard',
        relatedId: order.id,
      });
    } catch {
      // Une notification indisponible ne doit pas annuler la commande.
    }
    return order;
  }

  async rejectListingOffer(actorId: string, offerId: string): Promise<ListingOffer> {
    const rejected = await this.dataSource.transaction(async (manager) => {
      const offer = await manager.findOne(ListingOffer, { where: { id: offerId }, lock: { mode: 'pessimistic_write' } });
      if (!offer) throw new NotFoundException('Offre introuvable');
      if (offer.status !== 'pending') throw new BadRequestException('Cette négociation est terminée');
      const repondeur = actorId === offer.buyerId ? 'buyer' : actorId === offer.sellerId ? 'seller' : null;
      if (!repondeur) throw new ForbiddenException('Cette offre ne vous concerne pas');
      if (repondeur === offer.lastProposedBy) throw new BadRequestException('Vous ne pouvez pas refuser votre propre proposition');
      offer.status = 'rejected';
      return manager.save(offer);
    });
    try {
      const recipientId = actorId === rejected.buyerId ? rejected.sellerId : rejected.buyerId;
      await this.notificationsService.notify({
        recipientId,
        type: 'order_status',
        title: 'La négociation sur cette annonce est terminée',
        content: 'L’autre partie a refusé la dernière proposition de prix.',
        link: recipientId === rejected.buyerId ? '/orders' : '/dashboard',
        relatedId: rejected.id,
      });
    } catch {
      // Une notification indisponible ne doit pas faire échouer le refus.
    }
    return rejected;
  }

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
    if (isDemoMode()) {
      throw new ForbiddenException('Les commandes sont désactivées en mode démonstration');
    }
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
      if (listing.isDemo) throw new ForbiddenException('Cette annonce de démonstration ne peut pas être commandée');
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
          platformFee: 0,
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



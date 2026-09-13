import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../entities/index.js';
import type { AuthUser } from '../auth/current-user.decorator.js';
import { CarrierWebhookHeaders, DeliveryCarrierService, type CreateDeliveryRideDto, type DeliveryRideResponse } from './delivery-carrier.service.js';

interface CreateOrderDeliveryRideInput {
  pickup?: Partial<CreateDeliveryRideDto['pickup']>;
  dropoff?: Partial<CreateDeliveryRideDto['dropoff']>;
  packageDetails?: CreateDeliveryRideDto['packageDetails'];
  instructions?: string;
}

@Injectable()
export class DeliveryOrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    private readonly carrierService: DeliveryCarrierService,
  ) {}

  async createRideForOrder(orderId: string, user: AuthUser, input: CreateOrderDeliveryRideInput = {}): Promise<DeliveryRideResponse> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: { buyer: true, seller: true, listing: true },
    });
    if (!order) throw new NotFoundException('Commande introuvable');
    if (order.buyerId !== user.id && order.sellerId !== user.id && user.role !== 'admin') {
      throw new ForbiddenException('Cette commande ne vous concerne pas');
    }
    if (order.deliveryMethod !== 'carrier') {
      throw new BadRequestException('Cette commande ne nécessite pas de transporteur');
    }
    if (!order.deliveryAddress?.trim() && !input.dropoff?.location?.address?.trim()) {
      throw new BadRequestException('Adresse de livraison manquante');
    }
    if (order.deliveryTrackingId) {
      return this.toDeliveryRideResponse(order);
    }

    const ride = await this.carrierService.createDeliveryRide({
      orderId: order.id,
      orderType: 'product',
      pickup: {
        contact: {
          name: input.pickup?.contact?.name || order.seller?.name || 'ArtisanConnect vendeur',
          phone: input.pickup?.contact?.phone || order.seller?.phone || '+237600000000',
          email: input.pickup?.contact?.email || order.seller?.email,
        },
        location: {
          address: input.pickup?.location?.address || order.seller?.location || 'Adresse atelier à confirmer',
          city: input.pickup?.location?.city,
          neighborhood: input.pickup?.location?.neighborhood,
          landmark: input.pickup?.location?.landmark,
          latitude: input.pickup?.location?.latitude,
          longitude: input.pickup?.location?.longitude,
        },
      },
      dropoff: {
        contact: {
          name: input.dropoff?.contact?.name || order.buyer?.name || 'Client ArtisanConnect',
          phone: input.dropoff?.contact?.phone || order.buyer?.phone || '+237600000000',
          email: input.dropoff?.contact?.email || order.buyer?.email,
        },
        location: {
          address: input.dropoff?.location?.address || order.deliveryAddress || undefined,
          city: input.dropoff?.location?.city,
          neighborhood: input.dropoff?.location?.neighborhood,
          landmark: input.dropoff?.location?.landmark,
          latitude: input.dropoff?.location?.latitude ?? order.deliveryLatitude ?? undefined,
          longitude: input.dropoff?.location?.longitude ?? order.deliveryLongitude ?? undefined,
        },
      },
      packageDetails: input.packageDetails || {
        description: order.listing?.title || `Commande ${order.id}`,
        valueAmount: Number(order.totalPrice),
      },
      instructions: input.instructions,
    });

    order.deliveryCarrier = ride.carrierName;
    order.deliveryTrackingId = ride.trackingId;
    order.deliveryStatus = ride.status;
    order.deliveryTrackingUrl = ride.trackingUrl || null;
    order.deliveryCost = ride.estimatedCost ?? null;
    await this.ordersRepository.save(order);

    return ride;
  }

  async getOrderDeliveryStatus(orderId: string, user: AuthUser): Promise<DeliveryRideResponse> {
    const order = await this.ordersRepository.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Commande introuvable');
    if (order.buyerId !== user.id && order.sellerId !== user.id && user.role !== 'admin') {
      throw new ForbiddenException('Cette commande ne vous concerne pas');
    }
    if (!order.deliveryTrackingId) throw new NotFoundException('Aucune course transporteur associée');

    const ride = await this.carrierService.getDeliveryStatus(order.deliveryTrackingId);
    order.deliveryCarrier = ride.carrierName;
    order.deliveryStatus = ride.status;
    order.deliveryTrackingUrl = ride.trackingUrl || order.deliveryTrackingUrl;
    order.deliveryCost = ride.estimatedCost ?? order.deliveryCost;
    await this.ordersRepository.save(order);

    return ride;
  }

  async handleCarrierWebhook(body: Record<string, unknown>, headers: CarrierWebhookHeaders, rawBody?: Buffer) {
    this.carrierService.verifyWebhookSignature(headers, rawBody);
    const event = await this.carrierService.handleWebhook(body);
    if (!event.trackingId) return { success: false, message: 'trackingId absent' };

    const order = await this.ordersRepository.findOne({ where: { deliveryTrackingId: event.trackingId } });
    if (!order) return { success: false, message: `Commande introuvable pour le tracking ${event.trackingId}` };

    order.deliveryStatus = this.carrierService.normalizeStatus(event.status);
    if (order.deliveryStatus === 'picking_up' || order.deliveryStatus === 'in_transit' || order.deliveryStatus === 'delivered') {
      order.carrierPickedUp = true;
    }
    if (order.deliveryStatus === 'delivered') {
      order.carrierVerified = true;
    }
    if (order.deliveryStatus === 'cancelled') {
      order.cancellationReason = order.cancellationReason || 'Livraison transporteur annulée';
    }
    await this.ordersRepository.save(order);

    return { success: true, orderId: order.id, trackingId: order.deliveryTrackingId, status: order.deliveryStatus };
  }

  private toDeliveryRideResponse(order: Order): DeliveryRideResponse {
    return {
      trackingId: order.deliveryTrackingId!,
      status: order.deliveryStatus,
      carrierName: order.deliveryCarrier || 'Gozem',
      estimatedCost: order.deliveryCost === null ? undefined : Number(order.deliveryCost),
      trackingUrl: order.deliveryTrackingUrl || undefined,
    };
  }
}

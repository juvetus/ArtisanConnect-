import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';

export interface DeliveryLocation {
  address?: string;
  city?: string;
  neighborhood?: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
}

export interface DeliveryContact {
  name: string;
  phone: string;
  email?: string;
}

export interface CreateDeliveryRideDto {
  orderId: string;
  orderType: 'product' | 'service';
  pickup: {
    contact: DeliveryContact;
    location: DeliveryLocation;
  };
  dropoff: {
    contact: DeliveryContact;
    location: DeliveryLocation;
  };
  packageDetails?: {
    description: string;
    weightKg?: number;
    valueAmount?: number;
  };
  instructions?: string;
}

export interface DeliveryRideResponse {
  trackingId: string;
  status: 'pending' | 'assigned' | 'picking_up' | 'in_transit' | 'delivered' | 'cancelled';
  carrierName: string;
  estimatedCost?: number;
  driver?: {
    name: string;
    phone: string;
    vehiclePlate?: string;
    latitude?: number;
    longitude?: number;
  };
  trackingUrl?: string;
  rawResponse?: unknown;
}

export interface DeliveryEstimateDto {
  pickup: DeliveryLocation;
  dropoff: DeliveryLocation;
  weightKg?: number;
}

export interface DeliveryEstimateResponse {
  carrierName: string;
  estimatedPrice: number;
  currency: string;
  estimatedDurationMinutes: number;
  distanceKm?: number;
}

export type DeliveryStatus = DeliveryRideResponse['status'];
export type CarrierWebhookHeaders = Record<string, string | string[] | undefined>;

@Injectable()
export class DeliveryCarrierService {
  private readonly logger = new Logger(DeliveryCarrierService.name);
  private readonly apiKey: string | undefined;
  private readonly apiUrl: string | undefined;
  private readonly webhookSecret: string | undefined;
  private readonly providerName: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('CARRIER_API_KEY');
    this.apiUrl = this.config.get<string>('CARRIER_API_URL') || 'https://api.gozem.co/v1';
    this.webhookSecret = this.config.get<string>('CARRIER_WEBHOOK_SECRET');
    this.providerName = this.config.get<string>('CARRIER_PROVIDER') || 'Gozem';
  }

  verifyWebhookSignature(headers: CarrierWebhookHeaders, rawBody?: Buffer): void {
    if (!this.apiKey && !this.webhookSecret) return;
    if (!this.webhookSecret) throw new UnauthorizedException('CARRIER_WEBHOOK_SECRET doit être configuré');
    if (!rawBody?.length) throw new UnauthorizedException('Body brut indisponible pour vérifier le webhook transporteur');

    const received = this.getHeader(headers, 'x-gozem-signature') || this.getHeader(headers, 'x-carrier-signature') || this.getHeader(headers, 'x-signature');
    if (!received) throw new UnauthorizedException('Signature webhook transporteur absente');

    const expected = createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
    const normalizedReceived = received.startsWith('sha256=') ? received.slice('sha256='.length) : received;
    if (!this.secureCompare(normalizedReceived, expected)) {
      throw new UnauthorizedException('Signature webhook transporteur invalide');
    }
  }

  /**
   * Estime le tarif et la durée de la course de livraison
   */
  async estimateDelivery(data: DeliveryEstimateDto): Promise<DeliveryEstimateResponse> {
    if (!this.apiKey) {
      this.logger.warn(`API_KEY manquante pour ${this.providerName}. Utilisation du mode simulation/mock.`);
      return this.mockEstimate(data);
    }

    try {
      const response = await fetch(`${this.apiUrl}/deliveries/estimate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(data),
      });
      const payload = await this.parseJsonResponse(response, 'Erreur estimation Gozem');
      return {
        carrierName: String(payload.carrierName || payload.carrier_name || this.providerName),
        estimatedPrice: Number(payload.estimatedPrice || payload.estimated_price || payload.price || 0),
        currency: String(payload.currency || 'XAF'),
        estimatedDurationMinutes: Number(payload.estimatedDurationMinutes || payload.estimated_duration_minutes || payload.duration_minutes || 0),
        distanceKm: payload.distanceKm || payload.distance_km ? Number(payload.distanceKm || payload.distance_km) : undefined,
      };
    } catch (error) {
      this.logger.error(`Erreur lors de l'estimation de livraison auprès de ${this.providerName}:`, error);
      throw error;
    }
  }

  /**
   * Commande une course / assigne un livreur auprès de l'API transporteur
   */
  async createDeliveryRide(data: CreateDeliveryRideDto): Promise<DeliveryRideResponse> {
    if (!this.apiKey) {
      this.logger.warn(`API_KEY manquante pour ${this.providerName}. Enregistrement en mode simulation.`);
      return this.mockCreateRide(data);
    }

    try {
      const response = await fetch(`${this.apiUrl}/deliveries/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(data),
      });
      const payload = await this.parseJsonResponse(response, 'Erreur création course Gozem');
      return this.normalizeRideResponse(payload, data.orderId);
    } catch (error) {
      this.logger.error(`Erreur lors de la création de course ${this.providerName}:`, error);
      throw error;
    }
  }

  /**
   * Récupère le statut et la position en direct d'une course
   */
  async getDeliveryStatus(trackingId: string): Promise<DeliveryRideResponse> {
    if (!this.apiKey) {
      return {
        trackingId,
        status: 'in_transit',
        carrierName: this.providerName,
        driver: {
          name: 'Chauffeur Partenaire',
          phone: '+237600000000',
          vehiclePlate: 'LT-000-AA',
        },
      };
    }

    try {
      const response = await fetch(`${this.apiUrl}/deliveries/${trackingId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      const payload = await this.parseJsonResponse(response, 'Erreur suivi Gozem');
      return this.normalizeRideResponse(payload, trackingId);
    } catch (error) {
      this.logger.error(`Erreur lors du suivi de livraison ${trackingId}:`, error);
      throw error;
    }
  }

  /**
   * Traite les notifications webhook envoyées par l'API du transporteur
   */
  async handleWebhook(payload: Record<string, unknown>): Promise<{ success: boolean; trackingId?: string; status?: string }> {
    this.logger.log(`Webhook reçu du transporteur ${this.providerName}:`, payload);
    const trackingId = String(payload.trackingId || payload.tracking_id || payload.deliveryId || payload.delivery_id || '').trim();
    const status = this.normalizeStatus(payload.status || payload.delivery_status);
    return { success: Boolean(trackingId), trackingId, status };
  }

  // --- Mocks de secours lorsque les clés réelles ne sont pas configurées ---

  private mockEstimate(data: DeliveryEstimateDto): DeliveryEstimateResponse {
    // Calcul forfaitaire d'exemple basé sur la distance
    let distanceKm = 5;
    if (data.pickup.latitude && data.pickup.longitude && data.dropoff.latitude && data.dropoff.longitude) {
      distanceKm = this.calculateDistance(
        data.pickup.latitude,
        data.pickup.longitude,
        data.dropoff.latitude,
        data.dropoff.longitude,
      );
    }

    const estimatedPrice = Math.max(1000, Math.round(distanceKm * 250 + 500));
    const estimatedDurationMinutes = Math.max(15, Math.round(distanceKm * 4 + 10));

    return {
      carrierName: this.providerName,
      estimatedPrice,
      currency: 'XAF',
      estimatedDurationMinutes,
      distanceKm: Number(distanceKm.toFixed(1)),
    };
  }

  private mockCreateRide(data: CreateDeliveryRideDto): DeliveryRideResponse {
    const trackingId = `DEL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    return {
      trackingId,
      status: 'assigned',
      carrierName: this.providerName,
      estimatedCost: 1500,
      driver: {
        name: 'Livreur Gozem Assigné',
        phone: '+237699123456',
        vehiclePlate: 'CE-458-XY',
        latitude: data.pickup.location.latitude,
        longitude: data.pickup.location.longitude,
      },
      trackingUrl: `https://track.${this.providerName.toLowerCase()}.co/${trackingId}`,
      rawResponse: { simulated: true, orderId: data.orderId },
    };
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Rayon de la terre en km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  normalizeStatus(status: unknown): DeliveryStatus {
    const value = String(status || 'pending').toLowerCase();
    if (['assigned', 'accepted'].includes(value)) return 'assigned';
    if (['picking_up', 'pickup', 'arrived_at_pickup'].includes(value)) return 'picking_up';
    if (['in_transit', 'on_the_way', 'started'].includes(value)) return 'in_transit';
    if (['delivered', 'completed', 'success'].includes(value)) return 'delivered';
    if (['cancelled', 'canceled', 'failed'].includes(value)) return 'cancelled';
    return 'pending';
  }

  private async parseJsonResponse(response: Response, message: string): Promise<Record<string, any>> {
    const raw = await response.text();
    let payload: Record<string, any> = {};
    try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = {}; }
    if (!response.ok) {
      throw new Error(`${message}: ${response.status} - ${raw}`);
    }
    return payload;
  }

  private normalizeRideResponse(payload: Record<string, any>, fallbackTrackingId: string): DeliveryRideResponse {
    return {
      trackingId: String(payload.trackingId || payload.tracking_id || payload.id || fallbackTrackingId),
      status: this.normalizeStatus(payload.status || payload.delivery_status),
      carrierName: String(payload.carrierName || payload.carrier_name || this.providerName),
      estimatedCost: payload.estimatedCost || payload.estimated_cost || payload.price ? Number(payload.estimatedCost || payload.estimated_cost || payload.price) : undefined,
      driver: payload.driver ? {
        name: String(payload.driver.name || ''),
        phone: String(payload.driver.phone || ''),
        vehiclePlate: payload.driver.vehiclePlate || payload.driver.vehicle_plate,
        latitude: payload.driver.latitude ? Number(payload.driver.latitude) : undefined,
        longitude: payload.driver.longitude ? Number(payload.driver.longitude) : undefined,
      } : undefined,
      trackingUrl: payload.trackingUrl || payload.tracking_url,
      rawResponse: payload,
    };
  }

  private getHeader(headers: CarrierWebhookHeaders, name: string): string | undefined {
    const value = headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()];
    return Array.isArray(value) ? value[0] : value;
  }

  private secureCompare(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
  }
}

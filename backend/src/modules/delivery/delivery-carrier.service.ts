import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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

@Injectable()
export class DeliveryCarrierService {
  private readonly logger = new Logger(DeliveryCarrierService.name);
  private readonly apiKey: string | undefined;
  private readonly apiUrl: string | undefined;
  private readonly providerName: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('CARRIER_API_KEY');
    this.apiUrl = this.config.get<string>('CARRIER_API_URL') || 'https://api.gozem.co/v1';
    this.providerName = this.config.get<string>('CARRIER_PROVIDER') || 'Gozem';
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
      // TODO: Remplacer par l'appel HTTP officiel une fois l'accès API / token obtenu
      /*
      const response = await fetch(`${this.apiUrl}/deliveries/estimate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(data),
      });
      return await response.json();
      */
      return this.mockEstimate(data);
    } catch (error) {
      this.logger.error(`Erreur lors de l'estimation de livraison auprès de ${this.providerName}:`, error);
      return this.mockEstimate(data);
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
      // TODO: Remplacer par l'appel HTTP officiel une fois l'accès API / token obtenu
      /*
      const response = await fetch(`${this.apiUrl}/deliveries/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(data),
      });
      return await response.json();
      */
      return this.mockCreateRide(data);
    } catch (error) {
      this.logger.error(`Erreur lors de la création de course ${this.providerName}:`, error);
      return this.mockCreateRide(data);
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
      // TODO: Appel GET ${this.apiUrl}/deliveries/${trackingId}
      return {
        trackingId,
        status: 'in_transit',
        carrierName: this.providerName,
      };
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
    // TODO: Parser les statuts reçus du webhook partenaire
    return { success: true };
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
}

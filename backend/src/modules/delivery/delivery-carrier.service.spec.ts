import { describe, it, expect, beforeEach } from 'vitest';
import { DeliveryCarrierService } from './delivery-carrier.service.js';
import { ConfigService } from '@nestjs/config';

describe('DeliveryCarrierService', () => {
  let service: DeliveryCarrierService;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(() => {
    mockConfigService = {
      get: (key: string) => {
        if (key === 'CARRIER_PROVIDER') return 'Gozem';
        if (key === 'CARRIER_API_URL') return 'https://api.gozem.co/v1';
        return undefined; // Pas de CARRIER_API_KEY -> mode simulation/mock
      },
    };
    service = new DeliveryCarrierService(mockConfigService as ConfigService);
  });

  it('doit estimer un tarif et une durée de livraison cohérents en mode simulation', async () => {
    const estimate = await service.estimateDelivery({
      pickup: { latitude: 4.0511, longitude: 9.7679, city: 'Douala', neighborhood: 'Akwa' },
      dropoff: { latitude: 4.0700, longitude: 9.7100, city: 'Douala', neighborhood: 'Bonanjo' },
    });

    expect(estimate).toBeDefined();
    expect(estimate.carrierName).toBe('Gozem');
    expect(estimate.currency).toBe('XAF');
    expect(estimate.estimatedPrice).toBeGreaterThanOrEqual(1000);
    expect(estimate.estimatedDurationMinutes).toBeGreaterThanOrEqual(15);
    expect(estimate.distanceKm).toBeGreaterThan(0);
  });

  it('doit créer une course de livraison et renvoyer un trackingId et chauffeur assigné', async () => {
    const ride = await service.createDeliveryRide({
      orderId: 'cmd-test-123',
      orderType: 'product',
      pickup: {
        contact: { name: 'Artisan Menuisier', phone: '+237699112233' },
        location: { latitude: 4.0511, longitude: 9.7679, address: 'Atelier Akwa' },
      },
      dropoff: {
        contact: { name: 'Client Destinataire', phone: '+237677445566' },
        location: { latitude: 4.0700, longitude: 9.7100, address: 'Bureaux Bonanjo' },
      },
    });

    expect(ride.trackingId).toMatch(/^DEL-/);
    expect(ride.status).toBe('assigned');
    expect(ride.driver).toBeDefined();
    expect(ride.driver?.name).toContain('Gozem');
    expect(ride.trackingUrl).toBeDefined();
  });
});

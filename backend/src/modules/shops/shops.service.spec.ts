import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ShopsService } from './shops.service.js';
import { Shop } from '../../entities/shop.entity.js';
import { User } from '../../entities/user.entity.js';
import type { Repository } from 'typeorm';
import type { Listing } from '../../entities/listing.entity.js';
import type { ServiceReview } from '../../entities/service-review.entity.js';
import type { Service } from '../../entities/service.entity.js';
import { CustomerRequest } from '../../entities/customer-request.entity.js';
import type { NotificationsService } from '../notifications/notifications.service.js';

describe('ShopsService - Validation manuelle des boutiques Artisan', () => {
  let service: ShopsService;
  let mockShopsRepo: Partial<Record<keyof Repository<Shop>, any>>;
  let mockListingsRepo: Partial<Record<keyof Repository<Listing>, any>>;
  let mockUsersRepo: Partial<Record<keyof Repository<User>, any>>;
  let mockServiceReviewsRepo: Partial<Record<keyof Repository<ServiceReview>, any>>;
  let mockServicesRepo: Partial<Record<keyof Repository<Service>, any>>;
  let mockCustomerRequestsRepo: Partial<Record<keyof Repository<CustomerRequest>, any>>;
  let mockSubscriptionsService: { findPremiumUserIds: any };
  let mockCustomerRequestsService: { matchUnmatchedRequestsForArtisan: any };
  let mockNotificationsService: Partial<NotificationsService>;

  beforeEach(() => {
    mockShopsRepo = {
      create: vi.fn().mockImplementation((dto) => ({ ...dto, id: 'shop-uuid-1' })),
      save: vi.fn().mockImplementation((shop) => Promise.resolve(shop)),
      findOne: vi.fn(),
      find: vi.fn(),
      update: vi.fn().mockResolvedValue({ affected: 1 }),
    };

    mockListingsRepo = {
      find: vi.fn(),
    };

    mockUsersRepo = {
      find: vi.fn().mockResolvedValue([{ id: 'admin-1', role: 'admin', email: 'admin@test.com', name: 'Super Admin' }]),
      findOne: vi.fn().mockResolvedValue({ id: 'artisan-user-id', name: 'Artisan Paul', email: 'artisan@test.com' }),
    };

    mockServiceReviewsRepo = {
      createQueryBuilder: vi.fn(),
    };

    mockServicesRepo = {
      find: vi.fn().mockResolvedValue([]),
    };

    mockCustomerRequestsRepo = {
      find: vi.fn().mockResolvedValue([]),
    };

    mockSubscriptionsService = {
      findPremiumUserIds: vi.fn().mockResolvedValue(new Set<string>()),
    };

    mockCustomerRequestsService = {
      matchUnmatchedRequestsForArtisan: vi.fn().mockResolvedValue({ matchedRequests: 0, notifiedArtisans: 0 }),
    };

    mockNotificationsService = {
      notify: vi.fn().mockResolvedValue({} as any),
    };

    service = new ShopsService(
      mockShopsRepo as Repository<Shop>,
      mockListingsRepo as Repository<Listing>,
      mockUsersRepo as Repository<User>,
      mockServiceReviewsRepo as Repository<ServiceReview>,
      mockServicesRepo as Repository<Service>,
      mockCustomerRequestsRepo as Repository<CustomerRequest>,
      mockNotificationsService as NotificationsService,
      mockSubscriptionsService as never,
      mockCustomerRequestsService as never,
    );
  });

  it('expose uniquement le numéro WhatsApp déclaré comme contact public dans l’annuaire', async () => {
    mockShopsRepo.find = vi.fn().mockResolvedValue([
      {
        id: 'shop-contact',
        sellerId: 'seller-contact',
        status: 'active',
        isDemo: false,
        type: 'artisan',
        kycDocuments: [],
        identityVerified: false,
        successfulSales: 0,
        name: 'Atelier Contact',
        description: 'Artisan local',
        city: 'Douala',
        category: 'menuiserie',
        seller: { id: 'seller-contact', name: 'Awa', whatsappPhone: '+237699000001', phone: '+237699000099', verifiedPhone: true },
        createdAt: new Date(),
      },
      {
        id: 'shop-no-contact',
        sellerId: 'seller-no-contact',
        status: 'active',
        isDemo: false,
        type: 'artisan',
        kycDocuments: [],
        identityVerified: false,
        successfulSales: 0,
        name: 'Atelier Sans WhatsApp',
        description: 'Artisan local',
        city: 'Yaoundé',
        category: 'couture',
        seller: { id: 'seller-no-contact', name: 'Biya', whatsappPhone: null, phone: '+237699000099', verifiedPhone: true },
        createdAt: new Date(),
      },
    ]);
    mockListingsRepo.find = vi.fn().mockResolvedValue([]);
    const queryBuilder = {
      select: vi.fn().mockReturnThis(),
      addSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      getRawMany: vi.fn().mockResolvedValue([]),
    };
    mockServiceReviewsRepo.createQueryBuilder = vi.fn().mockReturnValue(queryBuilder);

    const result = await service.findPublicDirectory();
    const withContact = result.find((shop) => shop.id === 'shop-contact');
    const withoutContact = result.find((shop) => shop.id === 'shop-no-contact');

    expect(withContact?.whatsappPhone).toBe('+237699000001');
    expect(withoutContact?.whatsappPhone).toBeNull();
    expect(withContact).not.toHaveProperty('phone');
  });

  it('filtre l’annuaire par disponibilité, prix de départ, délai de réponse et rayon', async () => {
    const makeShop = (sellerKey: string, availability: string, latitude: number, longitude: number) => ({
      id: `shop-${sellerKey}`, sellerId: `seller-${sellerKey}`, status: 'active', isDemo: false, availability, latitude, longitude,
      type: 'artisan', kycDocuments: [], identityVerified: false, successfulSales: 0,
      name: `Atelier ${sellerKey}`, description: 'Menuiserie', city: 'Yaoundé', category: 'menuiserie',
      createdAt: new Date(), seller: { id: `seller-${sellerKey}`, name: sellerKey, whatsappPhone: null, verifiedPhone: true },
    });
    mockShopsRepo.find = vi.fn().mockResolvedValue([
      makeShop('nearby', 'available', 3.848, 11.502),
      makeShop('busy', 'busy', 3.848, 11.502),
      makeShop('expensive', 'available', 3.848, 11.502),
      makeShop('slow', 'available', 3.848, 11.502),
      makeShop('far', 'available', 4.5, 11.502),
    ]);
    mockListingsRepo.find = vi.fn().mockResolvedValue([
      { id: 'listing-nearby', shopId: 'shop-nearby', sellerId: 'seller-nearby', price: '25000', imageUrl: null },
      { id: 'listing-expensive', shopId: 'shop-expensive', sellerId: 'seller-expensive', price: '50000', imageUrl: null },
      { id: 'listing-slow', shopId: 'shop-slow', sellerId: 'seller-slow', price: '25000', imageUrl: null },
      { id: 'listing-far', shopId: 'shop-far', sellerId: 'seller-far', price: '25000', imageUrl: null },
    ]);
    mockServiceReviewsRepo.createQueryBuilder = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      addSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      getRawMany: vi.fn().mockResolvedValue([]),
    });
    const requestedAt = new Date('2026-09-01T10:00:00.000Z');
    mockCustomerRequestsRepo.find = vi.fn().mockResolvedValue([{
      createdAt: requestedAt,
      contactedArtisanIds: ['seller-nearby', 'seller-expensive', 'seller-slow', 'seller-far'],
      responses: [
        { artisanId: 'seller-nearby', message: 'Devis', createdAt: '2026-09-01T10:30:00.000Z' },
        { artisanId: 'seller-expensive', message: 'Devis', createdAt: '2026-09-01T10:30:00.000Z' },
        { artisanId: 'seller-slow', message: 'Devis', createdAt: '2026-09-01T11:30:00.000Z' },
        { artisanId: 'seller-far', message: 'Devis', createdAt: '2026-09-01T10:30:00.000Z' },
      ],
    }]);

    const result = await service.findPublicDirectory({
      availability: 'available',
      maxPrice: 30000,
      maxResponseMinutes: 60,
      latitude: 3.848,
      longitude: 11.502,
      maxDistanceKm: 5,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ priceFrom: 25000, averageResponseMinutes: 30, distanceKm: 0 });

    const unfiltered = await service.findPublicDirectory({ includeResponseStats: true });
    expect(unfiltered.find((shop) => shop.id === 'shop-nearby')?.averageResponseMinutes).toBe(30);
  });

  it('exclut les boutiques démo et non classées de l’annuaire du mode réel', async () => {
    const originalDemoMode = process.env.DEMO_MODE;
    process.env.DEMO_MODE = 'false';
    mockShopsRepo.find = vi.fn().mockResolvedValue([
      { id: 'shop-real', sellerId: 'seller-real', status: 'active', isDemo: false, type: 'artisan', kycDocuments: [], identityVerified: false, successfulSales: 0, name: 'Atelier réel', description: 'Atelier confirmé', city: 'Douala', category: 'menuiserie', seller: { id: 'seller-real', name: 'Awa', whatsappPhone: '+237699000001', verifiedPhone: true }, createdAt: new Date() },
      { id: 'shop-demo', sellerId: 'seller-demo', status: 'active', isDemo: true, type: 'artisan', kycDocuments: [], identityVerified: false, successfulSales: 0, name: 'Atelier démo', description: 'Exemple', city: 'Douala', category: 'menuiserie', seller: { id: 'seller-demo', name: 'Demo', whatsappPhone: null, verifiedPhone: false }, createdAt: new Date() },
      { id: 'shop-unclassified', sellerId: 'seller-old', status: 'active', isDemo: null, type: 'artisan', kycDocuments: [], identityVerified: false, successfulSales: 0, name: 'Ancienne boutique', description: 'À vérifier', city: 'Douala', category: 'menuiserie', seller: { id: 'seller-old', name: 'Ancien', whatsappPhone: null, verifiedPhone: false }, createdAt: new Date() },
    ]);
    mockListingsRepo.find = vi.fn().mockResolvedValue([]);
    const queryBuilder = {
      select: vi.fn().mockReturnThis(),
      addSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      getRawMany: vi.fn().mockResolvedValue([]),
    };
    mockServiceReviewsRepo.createQueryBuilder = vi.fn().mockReturnValue(queryBuilder);

    try {
      const result = await service.findPublicDirectory();
      expect(result.map((shop) => shop.id)).toEqual(['shop-real']);
    } finally {
      if (originalDemoMode === undefined) delete process.env.DEMO_MODE;
      else process.env.DEMO_MODE = originalDemoMode;
    }
  });

  it('doit créer une boutique de type artisan avec le statut PENDING et notifier les admins', async () => {
    const shop = await service.create('artisan-user-id', {
      type: 'artisan',
      name: 'Atelier Bois Noble',
      description: 'Atelier de menuiserie artisanale',
      mobileMoneyNumber: '+237699001122',
      deliveryMode: 'workshop',
      kycDocuments: [
        { label: 'piece_identite', url: '/uploads/cni.jpg' },
        { label: 'photo_atelier', url: '/uploads/atelier.jpg' },
        { label: 'photo_produit_1', url: '/uploads/p1.jpg' },
        { label: 'photo_produit_2', url: '/uploads/p2.jpg' },
        { label: 'photo_produit_3', url: '/uploads/p3.jpg' },
      ],
    });

    expect(shop).toBeDefined();
    expect(shop.status).toBe('pending');
    expect(mockShopsRepo.save).toHaveBeenCalled();
    expect(mockNotificationsService.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: 'admin-1',
        type: 'shop_review',
        title: 'Nouvelle boutique artisan à valider',
      }),
    );
  });

  it('doit créer une boutique revendeur automatiquement avec le statut ACTIVE si preuves complètes', async () => {
    const shop = await service.create('reseller-user-id', {
      type: 'reseller',
      name: 'Boutique Revendeur',
      description: 'Revente objets artisanaux',
      mobileMoneyNumber: '+237699001122',
      deliveryMode: 'home',
      kycDocuments: [
        { label: 'video_vendeur_produit', url: '/uploads/v.mp4' },
        { label: 'photo_produit', url: '/uploads/p.jpg' },
        { label: 'photo_produit_emballe', url: '/uploads/pe.jpg' },
      ],
    });

    expect(shop.status).toBe('active');
  });

  it('doit garder une boutique revendeur en attente si les preuves sont incomplètes au lancement', async () => {
    const shop = await service.create('reseller-user-id', {
      type: 'reseller',
      name: 'Revendeur incomplet',
      description: 'Revente objets artisanaux',
      mobileMoneyNumber: '237699001122',
      deliveryMode: 'home',
      kycDocuments: [],
    });

    expect(shop.status).toBe('pending');
  });

  it('doit permettre la création sans tous les documents KYC au lancement', async () => {
    const shop = await service.create('artisan-user-id', {
      type: 'artisan',
      name: 'Atelier Incomplet',
      description: 'Test sans photos',
      mobileMoneyNumber: '+237699001122',
      deliveryMode: 'workshop',
      kycDocuments: [{ label: 'piece_identite', url: '/uploads/cni.jpg' }],
    });

    expect(shop.status).toBe('pending');
  });

  it('doit accepter un numéro fixe camerounais avec préfixe 00 237', async () => {
    const shop = await service.create('artisan-user-id', {
      type: 'artisan',
      name: 'Atelier numéro fixe',
      description: 'Test numéro fixe Cameroun',
      mobileMoneyNumber: '00 237 2 22 65 43 21',
      deliveryMode: 'workshop',
      kycDocuments: [],
    });

    expect(shop.mobileMoneyNumber).toBe('+237222654321');
  });

  it('doit refuser un numéro Mobile Money qui n’est pas camerounais', async () => {
    await expect(
      service.create('artisan-user-id', {
        type: 'artisan',
        name: 'Atelier numéro invalide',
        description: 'Test numéro invalide',
        mobileMoneyNumber: '+33123456789',
        deliveryMode: 'workshop',
        kycDocuments: [],
      }),
    ).rejects.toThrow('Le numéro doit être un numéro camerounais valide');
  });

  it('doit permettre à l’administrateur de valider (approuver) une boutique artisan pending', async () => {
    const pendingShop = {
      id: 'shop-uuid-1',
      name: 'Atelier Bois Noble',
      status: 'pending',
      isDemo: false,
      sellerId: 'artisan-user-id',
    } as unknown as Shop;

    mockShopsRepo.findOne = vi.fn()
      .mockResolvedValueOnce(pendingShop) // appel au début de review()
      .mockResolvedValueOnce({ ...pendingShop, status: 'active' }); // appel de findById()

    const reviewed = await service.review('shop-uuid-1', true);

    expect(mockShopsRepo.update).toHaveBeenCalledWith('shop-uuid-1', {
      status: 'active',
      rejectionReason: undefined,
    });
    expect(reviewed?.status).toBe('active');
    expect(mockCustomerRequestsService.matchUnmatchedRequestsForArtisan).toHaveBeenCalledWith('artisan-user-id');
  });

  it('doit permettre à l’administrateur de rejeter une boutique artisan avec motif', async () => {
    const pendingShop = {
      id: 'shop-uuid-2',
      name: 'Atelier Flou',
      status: 'pending',
      sellerId: 'artisan-user-id',
    } as unknown as Shop;

    mockShopsRepo.findOne = vi.fn()
      .mockResolvedValueOnce(pendingShop)
      .mockResolvedValueOnce({ ...pendingShop, status: 'rejected', rejectionReason: 'Photos d’atelier non conformes' });

    const reviewed = await service.review('shop-uuid-2', false, 'Photos d’atelier non conformes');

    expect(mockShopsRepo.update).toHaveBeenCalledWith('shop-uuid-2', {
      status: 'rejected',
      rejectionReason: 'Photos d’atelier non conformes',
    });
    expect(reviewed?.status).toBe('rejected');
    expect(reviewed?.rejectionReason).toBe('Photos d’atelier non conformes');
  });

  it('doit incrémenter une statistique backend de boutique', async () => {
    const shop = {
      id: 'shop-uuid-1',
      sellerId: 'artisan-user-id',
      status: 'active',
      viewsCount: 2,
      whatsappContactClicks: 1,
      whatsappShareClicks: 0,
    } as unknown as Shop;

    mockShopsRepo.findOne = vi.fn().mockResolvedValue(shop);
    mockShopsRepo.save = vi.fn().mockImplementation(async (value) => value);

    const result = await service.incrementMetric('shop-uuid-1', 'whatsappContactClicks', 2);

    expect(result.whatsappContactClicks).toBe(3);
    expect(mockShopsRepo.save).toHaveBeenCalled();
  });

  it('doit bloquer la publication d’annonce si la boutique est encore pending', async () => {
    mockShopsRepo.findOne = vi.fn().mockResolvedValue({
      id: 'shop-uuid-1',
      sellerId: 'artisan-user-id',
      status: 'pending',
    });

    await expect(
      service.assertShopActiveForSeller('artisan-user-id', 'shop-uuid-1', 'artisan'),
    ).rejects.toThrow('Votre boutique doit être validée avant de publier des annonces');
  });

  it('doit autoriser la publication d’annonce si la boutique est active', async () => {
    mockShopsRepo.findOne = vi.fn().mockResolvedValue({
      id: 'shop-uuid-1',
      sellerId: 'artisan-user-id',
      status: 'active',
    });

    await expect(
      service.assertShopActiveForSeller('artisan-user-id', 'shop-uuid-1', 'artisan'),
    ).resolves.not.toThrow();
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ShopsService } from './shops.service.js';
import { Shop } from '../../entities/shop.entity.js';
import { User } from '../../entities/user.entity.js';
import type { Repository } from 'typeorm';
import type { Listing } from '../../entities/listing.entity.js';
import type { NotificationsService } from '../notifications/notifications.service.js';
import type { EmailService } from '../email/email.service.js';

describe('ShopsService - Validation manuelle des boutiques Artisan', () => {
  let service: ShopsService;
  let mockShopsRepo: Partial<Record<keyof Repository<Shop>, any>>;
  let mockListingsRepo: Partial<Record<keyof Repository<Listing>, any>>;
  let mockUsersRepo: Partial<Record<keyof Repository<User>, any>>;
  let mockNotificationsService: Partial<NotificationsService>;
  let mockEmailService: Partial<EmailService>;

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

    mockNotificationsService = {
      notify: vi.fn().mockResolvedValue({} as any),
    };

    mockEmailService = {
      send: vi.fn().mockResolvedValue(true),
    };

    service = new ShopsService(
      mockShopsRepo as Repository<Shop>,
      mockListingsRepo as Repository<Listing>,
      mockUsersRepo as Repository<User>,
      mockNotificationsService as NotificationsService,
      mockEmailService as EmailService,
    );
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
    expect(mockEmailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'admin@test.com',
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
      sellerId: 'artisan-user-id',
    } as Shop;

    mockShopsRepo.findOne = vi.fn()
      .mockResolvedValueOnce(pendingShop) // appel au début de review()
      .mockResolvedValueOnce({ ...pendingShop, status: 'active' }); // appel de findById()

    const reviewed = await service.review('shop-uuid-1', true);

    expect(mockShopsRepo.update).toHaveBeenCalledWith('shop-uuid-1', {
      status: 'active',
      rejectionReason: undefined,
    });
    expect(reviewed?.status).toBe('active');
  });

  it('doit permettre à l’administrateur de rejeter une boutique artisan avec motif', async () => {
    const pendingShop = {
      id: 'shop-uuid-2',
      name: 'Atelier Flou',
      status: 'pending',
      sellerId: 'artisan-user-id',
    } as Shop;

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

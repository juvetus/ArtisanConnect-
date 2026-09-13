import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Shop, type ShopType } from '../../entities/shop.entity.js';
import { Listing } from '../../entities/listing.entity.js';
import { User } from '../../entities/user.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { EmailService } from '../email/email.service.js';
import { StorageService } from '../storage/storage.service.js';

/** Nombre de ventes réussies pour débloquer les badges vendeur. */
const VERIFIED_BADGE_THRESHOLD = 3;
const TOP_SELLER_BADGE_THRESHOLD = 20;

@Injectable()
export class ShopsService {
  constructor(
    @InjectRepository(Shop)
    private shopsRepository: Repository<Shop>,
    @InjectRepository(Listing)
    private listingsRepository: Repository<Listing>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private notificationsService: NotificationsService,
    private emailService: EmailService,
  ) {}

  async getSignedKycUrl(shopId: string, label: string, storageService: StorageService) {
    const shop = await this.shopsRepository.findOne({ where: { id: shopId } });
    const document = shop?.kycDocuments?.find((item) => item.label === label);
    if (!shop || !document) throw new NotFoundException('Document KYC introuvable');
    if (document.publicId) {
      return { url: storageService.signedPrivateUrl(document.publicId, document.resourceType ?? 'raw', document.format) };
    }
    return { url: document.url };
  }

  async create(
    sellerId: string,
    data: {
      type: ShopType;
      name: string;
      description: string;
      category?: string;
      city?: string;
      neighborhood?: string;
      market?: string;
      latitude?: number;
      longitude?: number;
      mobileMoneyNumber: string;
      deliveryMode: 'workshop' | 'home';
      kycDocuments: { label: string; url: string }[];
      isWomenLed?: boolean;
      isCooperative?: boolean;
    },
  ): Promise<Shop> {
    const required = Shop.requiredDocuments(data.type);
    const provided = new Set(data.kycDocuments.map((doc) => doc.label));
    const missing = required.filter((label) => !provided.has(label));
    const mobileMoneyNumber = this.normalizeCameroonMobileMoneyNumber(data.mobileMoneyNumber);

    const hasCompleteKyc = missing.length === 0;
    const status: Shop['status'] = data.type === 'artisan' || !hasCompleteKyc ? 'pending' : 'active';

    const shop = this.shopsRepository.create({ ...data, mobileMoneyNumber, sellerId, status });
    const savedShop = await this.shopsRepository.save(shop);

    // Si la boutique artisan nécessite une validation manuelle, notifier tous les admins
    if (status === 'pending') {
      try {
        const admins = await this.usersRepository.find({ where: { role: 'admin' } });
        const seller = await this.usersRepository.findOne({ where: { id: sellerId } });
        const sellerName = seller?.name || 'Un artisan';

        for (const admin of admins) {
          await this.notificationsService.notify({
            recipientId: admin.id,
            type: 'shop_review',
            title: 'Nouvelle boutique artisan à valider',
            content: `${sellerName} a soumis sa boutique « ${savedShop.name} ». Les pièces KYC pourront être complétées après création.`,
            link: '/admin',
            relatedId: savedShop.id,
          });

          if (admin.email) {
            await this.emailService.send({
              to: admin.email,
              subject: `[ArtisanConnect] Nouvelle boutique artisan à valider : ${savedShop.name}`,
              text: `Bonjour ${admin.name || 'Admin'},\n\n${sellerName} a créé la boutique artisan « ${savedShop.name} ».\nLes pièces KYC pourront être complétées après création.\n\nLien : /admin\n\nArtisanConnect`,
              html: `<p>Bonjour ${admin.name || 'Admin'},</p><p><strong>${sellerName}</strong> a créé la boutique artisan <strong>« ${savedShop.name} »</strong>.</p><p>Les pièces KYC pourront être complétées après création.</p><p><a href="/admin">Accéder au panneau d'administration</a></p><p>ArtisanConnect</p>`,
            });
          }
        }
      } catch (err) {
        // La notification ne doit pas bloquer la transaction de création de la boutique
      }
    }

    return savedShop;
  }

  private normalizeCameroonMobileMoneyNumber(phone: string): string {
    const normalized = String(phone || '').replace(/[\s().-]/g, '').replace(/^00/, '+');
    const withoutCountryCode = normalized.startsWith('+237')
      ? normalized.slice(4)
      : normalized.startsWith('237')
        ? normalized.slice(3)
        : normalized;

    if (!/^6\d{8}$/.test(withoutCountryCode)) {
      throw new BadRequestException('Le numéro Mobile Money doit être un numéro camerounais valide');
    }

    return `+237${withoutCountryCode}`;
  }

  async findBySeller(sellerId: string): Promise<Shop[]> {
    return this.shopsRepository.find({ where: { sellerId }, order: { createdAt: 'DESC' } });
  }

  /** Vue publique : boutique active + ses annonces actives, sans données sensibles. */
  async findPublicById(id: string): Promise<{ shop: Omit<Shop, 'kycDocuments' | 'mobileMoneyNumber'>; listings: Listing[] } | null> {
    const shop = await this.shopsRepository.findOne({
      where: { id, status: 'active' },
      relations: { seller: true },
    });
    if (!shop) return null;
    const listings = await this.listingsRepository.find({
      where: { shopId: id, status: 'active' },
      order: { createdAt: 'DESC' },
    });
    const { kycDocuments: _k, mobileMoneyNumber: _m, ...publicShop } = shop;
    return { shop: publicShop, listings };
  }

  async findById(id: string): Promise<Shop | null> {
    return this.shopsRepository.findOne({ where: { id }, relations: { seller: true } });
  }

  /** Boutiques en attente de validation manuelle (admin). */
  async findPending(): Promise<Shop[]> {
    return this.shopsRepository.find({ where: { status: 'pending' }, relations: { seller: true } });
  }

  async update(
    id: string,
    sellerId: string,
    data: Partial<Pick<Shop, 'name' | 'description' | 'category' | 'deliveryMode'>>,
  ): Promise<Shop | null> {
    const shop = await this.shopsRepository.findOne({ where: { id } });
    if (!shop) throw new NotFoundException('Boutique introuvable');
    if (shop.sellerId !== sellerId) throw new ForbiddenException('Cette boutique ne vous appartient pas');
    await this.shopsRepository.update(id, data);
    return this.findById(id);
  }

  /** Validation manuelle admin (boutiques Artisan, ou réexamen). */
  async review(id: string, approve: boolean, reason?: string): Promise<Shop | null> {
    const shop = await this.shopsRepository.findOne({ where: { id } });
    if (!shop) throw new NotFoundException('Boutique introuvable');
    if (shop.status !== 'pending') {
      throw new BadRequestException('Cette boutique a déjà été traitée');
    }
    await this.shopsRepository.update(id, {
      status: approve ? 'active' : 'rejected',
      rejectionReason: approve ? undefined : (reason ?? 'Preuves insuffisantes'),
    });

    // Notifier l'artisan de la décision
    try {
      const seller = await this.usersRepository.findOne({ where: { id: shop.sellerId } });
      if (seller) {
        await this.notificationsService.notify({
          recipientId: seller.id,
          type: 'shop_review',
          title: approve ? 'Boutique validée !' : 'Boutique refusée',
          content: approve
            ? `Votre boutique « ${shop.name} » a été approuvée. Vous pouvez maintenant publier vos annonces !`
            : `Votre boutique « ${shop.name} » a été refusée. Motif : ${reason ?? 'Preuves KYC insuffisantes'}.`,
          link: '/dashboard',
          relatedId: shop.id,
        });

        if (seller.email) {
          await this.emailService.send({
            to: seller.email,
            subject: approve
              ? `[ArtisanConnect] Votre boutique « ${shop.name} » est validée !`
              : `[ArtisanConnect] Décision concernant votre boutique « ${shop.name} »`,
            text: approve
              ? `Bonjour ${seller.name},\n\nFélicitations ! Votre boutique « ${shop.name} » a été validée par notre équipe. Vous pouvez dès à présent créer vos annonces.\n\nAccédez à votre atelier : /dashboard\n\nArtisanConnect`
              : `Bonjour ${seller.name},\n\nVotre boutique « ${shop.name} » n'a pas pu être validée.\nMotif : ${reason ?? 'Preuves KYC insuffisantes'}.\n\nArtisanConnect`,
          });
        }
      }
    } catch {
      // Notification non bloquante
    }

    return this.findById(id);
  }

  async setActive(id: string, active: boolean): Promise<Shop | null> {
    const shop = await this.shopsRepository.findOne({ where: { id } });
    if (!shop) throw new NotFoundException('Boutique introuvable');
    if (active && shop.status === 'rejected') {
      throw new BadRequestException('Une boutique rejetée doit être revalidée par un admin');
    }
    await this.shopsRepository.update(id, { status: active ? 'active' : 'suspended' });
    return this.findById(id);
  }

  /**
   * Compte une vente réussie et met à jour les badges
   * ("Vendeur vérifié" à 3 ventes, "Top vendeur" à 20).
   */
  async recordSuccessfulSale(sellerId: string): Promise<void> {
    const shops = await this.shopsRepository.find({ where: { sellerId, status: 'active' } });
    for (const shop of shops) {
      const sales = shop.successfulSales + 1;
      await this.shopsRepository.update(shop.id, {
        successfulSales: sales,
        verifiedBadge: sales >= VERIFIED_BADGE_THRESHOLD || shop.verifiedBadge,
        topSellerBadge: sales >= TOP_SELLER_BADGE_THRESHOLD || shop.topSellerBadge,
      });
    }
  }

  /** Bloque toutes les boutiques actives d'un vendeur fautif (fraude). */
  async setActiveSellerShopsSuspended(sellerId: string): Promise<void> {
    await this.shopsRepository.update({ sellerId, status: 'active' }, { status: 'suspended' });
  }

  /** Le vendeur ne peut publier que via une boutique active. */
  async assertShopActiveForSeller(sellerId: string, shopId?: string, sellerRole?: 'artisan' | 'client' | 'institution' | 'admin'): Promise<void> {
    if (shopId) {
      const shop = await this.shopsRepository.findOne({ where: { id: shopId } });
      if (!shop) throw new NotFoundException('Boutique introuvable');
      if (shop.sellerId !== sellerId) throw new ForbiddenException('Cette boutique ne vous appartient pas');
      if (shop.status !== 'active') {
        throw new BadRequestException('Votre boutique doit être validée avant de publier des annonces');
      }
      return;
    }
    if (sellerRole === 'client') return;
    const shops = await this.shopsRepository.find({ where: { sellerId } });
    if (shops.some((shop) => shop.status === 'active')) return;
    throw new BadRequestException(
      'Créez une boutique active (KYC complet) avant de publier une annonce',
    );
  }
}

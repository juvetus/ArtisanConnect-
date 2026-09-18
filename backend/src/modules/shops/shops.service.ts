import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Shop, type ShopType } from '../../entities/shop.entity.js';
import { Listing } from '../../entities/listing.entity.js';
import { User } from '../../entities/user.entity.js';
import { ServiceReview } from '../../entities/service-review.entity.js';
import { computeVerification } from './verification.js';
import type { VerificationLevel } from './verification.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { EmailService } from '../email/email.service.js';
import { StorageService } from '../storage/storage.service.js';

/** Nombre de ventes réussies pour débloquer les badges vendeur. */
const VERIFIED_BADGE_THRESHOLD = 3;
const TOP_SELLER_BADGE_THRESHOLD = 20;

/** La recherche doit fonctionner avec ou sans accents (« Yaoundé » = « yaounde »). */
function normalizeSearchValue(value?: string | null): string {
  return (value ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

const VERIFICATION_RANK: Record<VerificationLevel, number> = {
  none: 0,
  phone: 1,
  profile: 2,
  identity: 3,
  recommended: 4,
};

@Injectable()
export class ShopsService {
  constructor(
    @InjectRepository(Shop)
    private shopsRepository: Repository<Shop>,
    @InjectRepository(Listing)
    private listingsRepository: Repository<Listing>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(ServiceReview)
    private serviceReviewsRepository: Repository<ServiceReview>,
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
      momoNumber?: string;
      orangeMoneyNumber?: string;
      mobileMoneyProvider?: 'momo' | 'orange_money' | 'both';
      deliveryMethods?: ('workshop' | 'home' | 'carrier')[];
      deliveryMode: 'workshop' | 'home';
      kycDocuments: { label: string; url: string }[];
      isWomenLed?: boolean;
      isCooperative?: boolean;
    },
  ): Promise<Shop> {
    const required = Shop.requiredDocuments(data.type);
    const provided = new Set(data.kycDocuments.map((doc) => doc.label));
    const missing = required.filter((label) => !provided.has(label));
    const mobileMoneyNumber = this.normalizeCameroonPhoneNumber(data.mobileMoneyNumber);

    const hasCompleteKyc = missing.length === 0;
    const status: Shop['status'] = data.type === 'artisan' || !hasCompleteKyc ? 'pending' : 'active';

    const provider = data.mobileMoneyProvider ?? 'both';
    if ((provider === 'momo' || provider === 'both') && !data.momoNumber && !data.mobileMoneyNumber) throw new BadRequestException('Le numéro MoMo est requis');
    if ((provider === 'orange_money' || provider === 'both') && !data.orangeMoneyNumber && !data.mobileMoneyNumber) throw new BadRequestException('Le numéro Orange Money est requis');
    const fallbackNumber = data.mobileMoneyNumber;
    const momoNumber = data.momoNumber ? this.normalizeCameroonPhoneNumber(data.momoNumber) : fallbackNumber ? this.normalizeCameroonPhoneNumber(fallbackNumber) : null;
    const orangeMoneyNumber = data.orangeMoneyNumber ? this.normalizeCameroonPhoneNumber(data.orangeMoneyNumber) : fallbackNumber ? this.normalizeCameroonPhoneNumber(fallbackNumber) : null;
    const shop = this.shopsRepository.create({ ...data, mobileMoneyNumber: momoNumber ?? orangeMoneyNumber!, momoNumber, orangeMoneyNumber, mobileMoneyProvider: provider, deliveryMethods: data.deliveryMethods?.length ? data.deliveryMethods : [data.deliveryMode ?? 'workshop'], sellerId, status });
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

  private normalizeCameroonPhoneNumber(phone: string): string {
    const normalized = String(phone || '').replace(/[\s().-]/g, '').replace(/^00/, '+');
    const withoutCountryCode = normalized.startsWith('+237')
      ? normalized.slice(4)
      : normalized.startsWith('237')
        ? normalized.slice(3)
        : normalized;

    if (!/^[26]\d{8}$/.test(withoutCountryCode)) {
      throw new BadRequestException('Le numéro doit être un numéro camerounais valide');
    }

    return `+237${withoutCountryCode}`;
  }

  async findBySeller(sellerId: string): Promise<Shop[]> {
    return this.shopsRepository.find({ where: { sellerId }, order: { createdAt: 'DESC' } });
  }

  async getMetrics(shopId: string): Promise<{ views: number; whatsappContactClicks: number; whatsappShareClicks: number }> {
    const shop = await this.shopsRepository.findOne({ where: { id: shopId } });
    if (!shop) throw new NotFoundException('Boutique introuvable');
    return {
      views: Number(shop.views ?? 0),
      whatsappContactClicks: Number(shop.whatsappContactClicks ?? 0),
      whatsappShareClicks: Number(shop.whatsappShareClicks ?? 0),
    };
  }

  async getMetricsForSeller(sellerId: string): Promise<Record<string, { views: number; whatsappContactClicks: number; whatsappShareClicks: number }>> {
    const shops = await this.shopsRepository.find({ where: { sellerId } });
    return shops.reduce<Record<string, { views: number; whatsappContactClicks: number; whatsappShareClicks: number }>>((acc, shop) => {
      acc[shop.id] = {
        views: Number(shop.views ?? 0),
        whatsappContactClicks: Number(shop.whatsappContactClicks ?? 0),
        whatsappShareClicks: Number(shop.whatsappShareClicks ?? 0),
      };
      return acc;
    }, {});
  }

  async incrementMetric(
    shopId: string,
    metric: 'views' | 'whatsappContactClicks' | 'whatsappShareClicks',
    delta = 1,
  ): Promise<{ views: number; whatsappContactClicks: number; whatsappShareClicks: number }> {
    const shop = await this.shopsRepository.findOne({ where: { id: shopId } });
    if (!shop) throw new NotFoundException('Boutique introuvable');

    const nextValue = Number(shop[metric] ?? 0) + Number(delta ?? 1);
    const updated = {
      ...shop,
      [metric]: nextValue,
    };

    await this.shopsRepository.save(updated);

    return {
      views: Number(updated.views ?? 0),
      whatsappContactClicks: Number(updated.whatsappContactClicks ?? 0),
      whatsappShareClicks: Number(updated.whatsappShareClicks ?? 0),
    };
  }

  /** Vue publique : boutique active + ses annonces actives, sans données sensibles. */
  async findPublicById(id: string): Promise<{ shop: Omit<Shop, 'kycDocuments' | 'mobileMoneyNumber'> & { verification: ReturnType<typeof computeVerification> }; listings: Listing[] } | null> {
    const shop = await this.shopsRepository.findOne({
      where: { id, status: 'active' },
      relations: { seller: true },
    });
    if (!shop) return null;
    const listings = await this.listingsRepository.find({
      where: { shopId: id, status: 'active' },
      order: { createdAt: 'DESC' },
    });
    const verification = computeVerification(shop, {
      phoneVerified: Boolean(shop.seller?.verifiedPhone),
      rating: await this.getSellerRating(shop.sellerId),
    });
    const { kycDocuments: _k, mobileMoneyNumber: _m, ...publicShop } = shop;
    return { shop: { ...publicShop, verification }, listings };
  }

  private async getSellerRating(sellerId: string): Promise<{ average: number | null; count: number }> {
    const result = await this.serviceReviewsRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'average')
      .addSelect('COUNT(review.id)', 'count')
      .where('review.recipientId = :sellerId', { sellerId })
      .getRawOne<{ average: string | null; count: string }>();
    return {
      average: result?.average ? Number(Number(result.average).toFixed(1)) : null,
      count: Number(result?.count ?? 0),
    };
  }

  async findById(id: string): Promise<Shop | null> {
    return this.shopsRepository.findOne({ where: { id }, relations: { seller: true } });
  }

  /**
   * Annuaire public d'artisans : boutiques actives, classées par niveau de confiance.
   * Aucun numéro de téléphone n'est exposé, le contact passe par la fiche boutique.
   */
  async findPublicDirectory(
    options: {
      take?: number;
      q?: string;
      city?: string;
      neighborhood?: string;
      category?: string;
      verified?: boolean;
      minRating?: number;
    } = {},
  ) {
    const take = Math.min(Math.max(Number(options.take) || 6, 1), 48);
    const shops = await this.shopsRepository.find({
      where: { status: 'active' },
      relations: { seller: true },
      take: 300,
    });

    const wantedCategory = normalizeSearchValue(options.category);
    const wantedCity = normalizeSearchValue(options.city);
    const wantedNeighborhood = normalizeSearchValue(options.neighborhood);
    const wantedQuery = normalizeSearchValue(options.q);

    const candidates = shops.filter((shop) => {
      if (wantedCategory && normalizeSearchValue(shop.category) !== wantedCategory) return false;
      if (wantedCity && !normalizeSearchValue(shop.city).includes(wantedCity)) return false;
      if (wantedNeighborhood && !normalizeSearchValue(shop.neighborhood).includes(wantedNeighborhood)) return false;
      if (wantedQuery) {
        const haystack = `${normalizeSearchValue(shop.name)} ${normalizeSearchValue(shop.description)} ${normalizeSearchValue(shop.category)} ${normalizeSearchValue(shop.city)} ${normalizeSearchValue(shop.neighborhood)} ${normalizeSearchValue(shop.market)}`;
        if (!haystack.includes(wantedQuery)) return false;
      }
      return true;
    });
    if (!candidates.length) return [];

    const sellerIds = [...new Set(candidates.map((shop) => shop.sellerId))];
    const ratings = await this.serviceReviewsRepository
      .createQueryBuilder('review')
      .select('review.recipientId', 'recipientId')
      .addSelect('AVG(review.rating)', 'average')
      .addSelect('COUNT(review.id)', 'count')
      .where('review.recipientId IN (:...sellerIds)', { sellerIds })
      .groupBy('review.recipientId')
      .getRawMany<{ recipientId: string; average: string; count: string }>();
    const ratingBySeller = new Map(
      ratings.map((row) => [
        row.recipientId,
        { average: Number(Number(row.average).toFixed(1)), count: Number(row.count) },
      ]),
    );

    const listings = await this.listingsRepository.find({
      where: { shopId: In(candidates.map((shop) => shop.id)), status: 'active' },
      order: { createdAt: 'DESC' },
    });
    const coverByShop = new Map<string, string>();
    for (const listing of listings) {
      if (listing.shopId && listing.imageUrl && !coverByShop.has(listing.shopId)) {
        coverByShop.set(listing.shopId, listing.imageUrl);
      }
    }

    const minRating = Number(options.minRating) || 0;

    return candidates
      .map((shop) => {
        const rating = ratingBySeller.get(shop.sellerId) ?? { average: null, count: 0 };
        return {
          id: shop.id,
          name: shop.name,
          description: shop.description,
          category: shop.category ?? null,
          city: shop.city,
          neighborhood: shop.neighborhood,
          verifiedBadge: shop.verifiedBadge,
          topSellerBadge: shop.topSellerBadge,
          isWomenLed: shop.isWomenLed,
          isCooperative: shop.isCooperative,
          successfulSales: shop.successfulSales,
          views: Number(shop.views ?? 0),
          createdAt: shop.createdAt,
          coverImageUrl: coverByShop.get(shop.id) ?? null,
          rating,
          verification: computeVerification(shop, {
            phoneVerified: Boolean(shop.seller?.verifiedPhone),
            rating,
          }),
          seller: {
            id: shop.sellerId,
            name: shop.seller?.name ?? null,
            verifiedPhone: Boolean(shop.seller?.verifiedPhone),
          },
        };
      })
      .filter((item) => {
        if (options.verified && !item.verification.steps.profile) return false;
        if (minRating && (item.rating.average ?? 0) < minRating) return false;
        return true;
      })
      .sort(
        (first, second) =>
          VERIFICATION_RANK[second.verification.level] - VERIFICATION_RANK[first.verification.level] ||
          (second.rating.average ?? 0) - (first.rating.average ?? 0) ||
          second.successfulSales - first.successfulSales ||
          second.views - first.views,
      )
      .slice(0, take);
  }

  /** Marque l'identité du vendeur comme réellement contrôlée (réservé aux administrateurs). */
  async setIdentityVerified(id: string, verified: boolean): Promise<Shop | null> {
    const shop = await this.shopsRepository.findOne({ where: { id } });
    if (!shop) throw new NotFoundException('Boutique introuvable');
    await this.shopsRepository.update(id, {
      identityVerified: verified,
      identityVerifiedAt: verified ? new Date() : null,
    });
    return this.findById(id);
  }

  /** Boutiques en attente de validation manuelle (admin). */
  async findPending(): Promise<Shop[]> {
    return this.shopsRepository.find({ where: { status: 'pending' }, relations: { seller: true } });
  }

  async update(
    id: string,
    sellerId: string,
    data: Partial<Pick<Shop, 'name' | 'description' | 'category' | 'deliveryMode' | 'deliveryMethods' | 'mobileMoneyNumber' | 'momoNumber' | 'orangeMoneyNumber' | 'mobileMoneyProvider'>>,
  ): Promise<Shop | null> {
    const shop = await this.shopsRepository.findOne({ where: { id } });
    if (!shop) throw new NotFoundException('Boutique introuvable');
    if (shop.sellerId !== sellerId) throw new ForbiddenException('Cette boutique ne vous appartient pas');
    const updateData = { ...data };
    if (updateData.mobileMoneyNumber) updateData.mobileMoneyNumber = this.normalizeCameroonPhoneNumber(updateData.mobileMoneyNumber);
    if (updateData.momoNumber) updateData.momoNumber = this.normalizeCameroonPhoneNumber(updateData.momoNumber);
    if (updateData.orangeMoneyNumber) updateData.orangeMoneyNumber = this.normalizeCameroonPhoneNumber(updateData.orangeMoneyNumber);
    await this.shopsRepository.update(id, updateData);
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

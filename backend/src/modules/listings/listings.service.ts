import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, MoreThan, Repository } from 'typeorm';
import { Listing } from '../../entities/index.js';
import { isDemoMode } from '../../demo-mode.js';
import { isListingCategoryAllowed } from './listing-category-policy.js';
import { CustomerRequestsService } from '../customer-requests/customer-requests.service.js';

/** Valeurs par défaut conservées pour les appels internes qui ne fournissent pas de politique. */
export const SPONSORING_DAYS = 7;
export const MAX_SPONSORED_PER_SELLER = 2;

/** Recherche insensible aux accents sans dépendre de l'extension Postgres `unaccent`. */
function unaccent(column: string): string {
  return `translate(lower(coalesce(${column}, '')), 'àáâãäçèéêëìíîïñòóôõöùúûüýÿ', 'aaaaaceeeeiiiinooooouuuuyy')`;
}

function normalizeSearchValue(value?: string | null): string {
  return (value ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

@Injectable()
export class ListingsService {
  constructor(
    @InjectRepository(Listing)
    private listingsRepository: Repository<Listing>,
    @Optional()
    private customerRequestsService?: CustomerRequestsService,
  ) {}

  async create(listing: Partial<Listing>): Promise<Listing> {
    if (!isListingCategoryAllowed(listing.type, listing.category)) {
      throw new BadRequestException('La catégorie doit correspondre au type de l’offre.');
    }
    const newListing = this.listingsRepository.create({ ...listing, isDemo: isDemoMode() });
    const savedListing = await this.listingsRepository.save(newListing);
    if (savedListing.status === 'active' && savedListing.isDemo !== true) {
      void this.customerRequestsService?.matchUnmatchedRequestsForArtisan(savedListing.sellerId).catch(() => undefined);
    }
    return savedListing;
  }

  async findById(id: string): Promise<Listing | null> {
    return this.listingsRepository.findOne({
      where: { id, ...(isDemoMode() ? {} : { isDemo: false }) },
      relations: { seller: true, shop: true },
    });
  }

  async findByCategory(category: string, skip = 0, take = 20): Promise<[Listing[], number]> {
    return this.listingsRepository.findAndCount({
      where: { category, status: 'active', ...(isDemoMode() ? {} : { isDemo: false }) },
      relations: { seller: true, shop: true },
      skip,
      take,
    });
  }

  async findByType(type: 'product' | 'service', skip = 0, take = 20): Promise<[Listing[], number]> {
    return this.listingsRepository.findAndCount({
      where: { type, status: 'active', ...(isDemoMode() ? {} : { isDemo: false }) },
      relations: { seller: true, shop: true },
      skip,
      take,
    });
  }

  async findBySeller(sellerId: string): Promise<Listing[]> {
    return this.listingsRepository.find({
      where: { sellerId, ...(isDemoMode() ? {} : { isDemo: false }) },
      relations: { seller: true, shop: true },
    });
  }

  async update(id: string, updateData: Partial<Listing>): Promise<Listing | null> {
    const listing = await this.listingsRepository.findOne({ where: { id } });
    if (!listing) return null;
    const nextType = updateData.type !== undefined ? updateData.type : listing.type;
    const nextCategory = updateData.category !== undefined ? updateData.category : listing.category;
    if (!isListingCategoryAllowed(nextType, nextCategory)) {
      throw new BadRequestException('La catégorie doit correspondre au type de l’offre.');
    }
    const { isDemo: _ignoredDemoFlag, ...safeUpdateData } = updateData;
    Object.assign(listing, safeUpdateData);
    await this.listingsRepository.save(listing);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.listingsRepository.update(id, { status: 'inactive' });
  }

  async findAll(skip = 0, take = 20): Promise<[Listing[], number]> {
    return this.listingsRepository.findAndCount({
      where: { status: 'active', ...(isDemoMode() ? {} : { isDemo: false }) },
      relations: { seller: true, shop: true },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  countActiveBySeller(sellerId: string): Promise<number> {
    return this.listingsRepository.count({ where: { sellerId, status: 'active' } });
  }

  countSponsoredBySeller(sellerId: string): Promise<number> {
    return this.listingsRepository.count({
      where: { sellerId, status: 'active', sponsoredUntil: MoreThan(new Date()) },
    });
  }

  /** Met une annonce en avant pour une durée limitée ; réservé à son propriétaire. */
  async sponsor(listingId: string, sellerId: string, days = SPONSORING_DAYS): Promise<Listing | null> {
    const listing = await this.listingsRepository.findOne({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Annonce introuvable');
    if (listing.sellerId !== sellerId) throw new ForbiddenException('Cette annonce ne vous appartient pas');
    if (listing.status !== 'active') throw new BadRequestException('Seule une annonce active peut être mise en avant');

    await this.listingsRepository.update(listingId, {
      sponsoredUntil: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
    });
    return this.findById(listingId);
  }

  async stopSponsoring(listingId: string, sellerId: string): Promise<Listing | null> {
    const listing = await this.listingsRepository.findOne({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Annonce introuvable');
    if (listing.sellerId !== sellerId) throw new ForbiddenException('Cette annonce ne vous appartient pas');

    await this.listingsRepository.update(listingId, { sponsoredUntil: null });
    return this.findById(listingId);
  }

  /**
   * Recherche unifiée du catalogue : texte libre (titre, métier, boutique, quartier),
   * filtres de localisation, de type et de budget.
   */
  async searchCatalog(
    filters: {
      q?: string;
      category?: string;
      type?: 'product' | 'service';
      audience?: 'women' | 'cooperatives';
      city?: string;
      neighborhood?: string;
      minPrice?: number;
      maxPrice?: number;
    },
    skip = 0,
    take = 20,
  ): Promise<[Listing[], number]> {
    const builder = this.listingsRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.seller', 'seller')
      .leftJoinAndSelect('listing.shop', 'shop')
      .where('listing.status = :status', { status: 'active' });

    if (!isDemoMode()) builder.andWhere('listing.isDemo = :isDemo', { isDemo: false });

    const query = normalizeSearchValue(filters.q);
    if (query) {
      builder.andWhere(
        new Brackets((where) => {
          where
            .where(`${unaccent('listing.title')} LIKE :q`)
            .orWhere(`${unaccent('listing.description')} LIKE :q`)
            .orWhere(`${unaccent('listing.category')} LIKE :q`)
            .orWhere(`${unaccent('shop.name')} LIKE :q`)
            .orWhere(`${unaccent('shop.city')} LIKE :q`)
            .orWhere(`${unaccent('shop.neighborhood')} LIKE :q`)
            .orWhere(`${unaccent('shop.market')} LIKE :q`);
        }),
        { q: `%${query}%` },
      );
    }

    if (filters.category) builder.andWhere('listing.category = :category', { category: filters.category });
    if (filters.type) builder.andWhere('listing.type = :type', { type: filters.type });
    if (filters.audience === 'women') {
      builder.andWhere('(shop.isWomenLed = :isWomenLed OR seller.gender = :sellerGender)', {
        isWomenLed: true,
        sellerGender: 'female',
      });
    }
    if (filters.audience === 'cooperatives') {
      builder.andWhere('(shop.isCooperative = :isCooperative OR seller.gender = :sellerGender)', {
        isCooperative: true,
        sellerGender: 'cooperative',
      });
    }

    const city = normalizeSearchValue(filters.city);
    if (city) builder.andWhere(`${unaccent('shop.city')} LIKE :city`, { city: `%${city}%` });

    const neighborhood = normalizeSearchValue(filters.neighborhood);
    if (neighborhood) builder.andWhere(`${unaccent('shop.neighborhood')} LIKE :neighborhood`, { neighborhood: `%${neighborhood}%` });

    if (Number.isFinite(filters.minPrice)) builder.andWhere('listing.price >= :minPrice', { minPrice: filters.minPrice });
    if (Number.isFinite(filters.maxPrice)) builder.andWhere('listing.price <= :maxPrice', { maxPrice: filters.maxPrice });

    return builder
      .addSelect("CASE WHEN listing.type = 'product' AND listing.stock <= 0 THEN 1 ELSE 0 END", 'stock_rank')
      // Les annonces sponsorisées passent devant, mais restent signalées comme telles côté client.
      .addSelect('CASE WHEN listing.sponsoredUntil > now() THEN 0 ELSE 1 END', 'sponsor_rank')
      .orderBy('stock_rank', 'ASC')
      .addOrderBy('sponsor_rank', 'ASC')
      .addOrderBy('listing.createdAt', 'DESC')
      .skip(skip)
      .take(take)
      .getManyAndCount();
  }
}


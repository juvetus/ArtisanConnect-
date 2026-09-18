import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, MoreThan, Repository } from 'typeorm';
import { Listing } from '../../entities/index.js';

/** Durée d'une mise en avant et nombre d'annonces sponsorisées simultanément par artisan. */
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
  ) {}

  async create(listing: Partial<Listing>): Promise<Listing> {
    const newListing = this.listingsRepository.create(listing);
    return this.listingsRepository.save(newListing);
  }

  async findById(id: string): Promise<Listing | null> {
    return this.listingsRepository.findOne({
      where: { id },
      relations: { seller: true, shop: true },
    });
  }

  async findByCategory(category: string, skip = 0, take = 20): Promise<[Listing[], number]> {
    return this.listingsRepository.findAndCount({
      where: { category, status: 'active' },
      relations: { seller: true, shop: true },
      skip,
      take,
    });
  }

  async findByType(type: 'product' | 'service', skip = 0, take = 20): Promise<[Listing[], number]> {
    return this.listingsRepository.findAndCount({
      where: { type, status: 'active' },
      relations: { seller: true, shop: true },
      skip,
      take,
    });
  }

  async findBySeller(sellerId: string): Promise<Listing[]> {
    return this.listingsRepository.find({
      where: { sellerId },
      relations: { seller: true, shop: true },
    });
  }

  async update(id: string, updateData: Partial<Listing>): Promise<Listing | null> {
    const listing = await this.listingsRepository.findOne({ where: { id } });
    if (!listing) return null;
    Object.assign(listing, updateData);
    await this.listingsRepository.save(listing);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.listingsRepository.update(id, { status: 'inactive' });
  }

  async findAll(skip = 0, take = 20): Promise<[Listing[], number]> {
    return this.listingsRepository.findAndCount({
      where: { status: 'active' },
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

    const city = normalizeSearchValue(filters.city);
    if (city) builder.andWhere(`${unaccent('shop.city')} LIKE :city`, { city: `%${city}%` });

    const neighborhood = normalizeSearchValue(filters.neighborhood);
    if (neighborhood) builder.andWhere(`${unaccent('shop.neighborhood')} LIKE :neighborhood`, { neighborhood: `%${neighborhood}%` });

    if (Number.isFinite(filters.minPrice)) builder.andWhere('listing.price >= :minPrice', { minPrice: filters.minPrice });
    if (Number.isFinite(filters.maxPrice)) builder.andWhere('listing.price <= :maxPrice', { maxPrice: filters.maxPrice });

    return builder
      // Les annonces sponsorisées passent devant, mais restent signalées comme telles côté client.
      .addSelect('CASE WHEN listing.sponsoredUntil > now() THEN 0 ELSE 1 END', 'sponsor_rank')
      .orderBy('sponsor_rank', 'ASC')
      .addOrderBy('listing.createdAt', 'DESC')
      .skip(skip)
      .take(take)
      .getManyAndCount();
  }
}


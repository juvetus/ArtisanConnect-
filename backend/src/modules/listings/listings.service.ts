import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Listing } from '../../entities/index.js';

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
      relations: { seller: true },
    });
  }

  async findByCategory(category: string, skip = 0, take = 20): Promise<[Listing[], number]> {
    return this.listingsRepository.findAndCount({
      where: { category, status: 'active' },
      relations: { seller: true },
      skip,
      take,
    });
  }

  async findByType(type: 'product' | 'service', skip = 0, take = 20): Promise<[Listing[], number]> {
    return this.listingsRepository.findAndCount({
      where: { type, status: 'active' },
      relations: { seller: true },
      skip,
      take,
    });
  }

  async findBySeller(sellerId: string): Promise<Listing[]> {
    return this.listingsRepository.find({
      where: { sellerId },
      relations: { seller: true },
    });
  }

  async update(id: string, updateData: Partial<Listing>): Promise<Listing | null> {
    await this.listingsRepository.update(id, updateData);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.listingsRepository.delete(id);
  }

  async findAll(skip = 0, take = 20): Promise<[Listing[], number]> {
    return this.listingsRepository.findAndCount({
      where: { status: 'active' },
      relations: { seller: true },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  async search(query: string, skip = 0, take = 20): Promise<[Listing[], number]> {
    return this.listingsRepository.findAndCount({
      where: [
        { title: ILike(`%${query}%`), status: 'active' },
        { description: ILike(`%${query}%`), status: 'active' },
      ],
      relations: { seller: true },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }
}


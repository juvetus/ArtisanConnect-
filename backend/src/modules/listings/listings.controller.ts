import { Controller, Get, Post, Patch, Delete, Param, Body, Query, DefaultValuePipe, ParseIntPipe, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ListingsService } from './listings.service.js';
import { Public } from '../auth/public.decorator.js';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator.js';
import type { Listing } from '../../entities/index.js';

@Controller('listings')
export class ListingsController {
  constructor(private listingsService: ListingsService) {}

  @Post()
  async createListing(@CurrentUser() user: AuthUser, @Body() listing: Partial<Listing>) {
    if (user.role !== 'artisan') {
      throw new ForbiddenException('Seuls les artisans peuvent publier une annonce');
    }
    // Le vendeur est toujours l'utilisateur authentifié, jamais celui fourni par le client.
    return this.listingsService.create({ ...listing, sellerId: user.id });
  }

  @Public()
  @Get(':id')
  async getListing(@Param('id') id: string) {
    const listing = await this.listingsService.findById(id);
    if (!listing) throw new NotFoundException('Annonce introuvable');
    return listing;
  }

  @Public()
  @Get()
  async searchListings(
    @Query('q') query?: string,
    @Query('category') category?: string,
    @Query('type') type?: 'product' | 'service',
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number = 0,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number = 20,
  ) {
    if (query) {
      return this.listingsService.search(query, skip, take);
    }
    if (category) {
      return this.listingsService.findByCategory(category, skip, take);
    }
    if (type) {
      return this.listingsService.findByType(type, skip, take);
    }
    return this.listingsService.findAll(skip, take);
  }

  @Public()
  @Get('seller/:sellerId')
  async getSellerListings(@Param('sellerId') sellerId: string) {
    return this.listingsService.findBySeller(sellerId);
  }

  @Patch(':id')
  async updateListing(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() updateData: Partial<Listing>,
  ) {
    await this.assertOwner(id, user);
    const { sellerId: _ignored, ...safeData } = updateData;
    return this.listingsService.update(id, safeData);
  }

  @Delete(':id')
  async deleteListing(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.assertOwner(id, user);
    await this.listingsService.delete(id);
    return { success: true };
  }

  private async assertOwner(id: string, user: AuthUser) {
    const listing = await this.listingsService.findById(id);
    if (!listing) throw new NotFoundException('Annonce introuvable');
    if (listing.sellerId !== user.id) {
      throw new ForbiddenException('Cette annonce ne vous appartient pas');
    }
  }
}


import { Controller, Get, Post, Patch, Delete, Param, Body, Query, DefaultValuePipe, ParseIntPipe, ForbiddenException, NotFoundException, UploadedFile, UploadedFiles, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ListingsService } from './listings.service.js';
import { ShopsService } from '../shops/shops.service.js';
import { Public } from '../auth/public.decorator.js';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator.js';
import type { Listing } from '../../entities/index.js';
import { StorageService } from '../storage/storage.service.js';
import { SubscriptionsService, FREE_PLAN_LISTING_LIMIT } from '../subscriptions/subscriptions.service.js';

@Controller('listings')
export class ListingsController {
  constructor(
    private listingsService: ListingsService,
    private shopsService: ShopsService,
    private storageService: StorageService,
    private subscriptionsService: SubscriptionsService,
  ) {}

  private static readonly UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
  private static readonly ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadImage(@CurrentUser() user: AuthUser, @UploadedFile() file?: Express.Multer.File) {
    if (user.role !== 'artisan') {
      throw new ForbiddenException('Seuls les artisans peuvent publier une annonce');
    }
    if (!file || !ListingsController.ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException('Image invalide (formats acceptés : JPEG, PNG, WebP, GIF)');
    }
    if (process.env.NODE_ENV === 'production' && !this.storageService.isEnabled()) {
      throw new BadRequestException('Le stockage Cloudinary doit être configuré avant les uploads de production.');
    }
    if (this.storageService.isEnabled()) {
      const upload = await this.storageService.uploadBuffer(file.buffer, 'artisanconnect/listings', 'image');
      return { imageUrl: upload.url };
    }
    await mkdir(ListingsController.UPLOAD_DIR, { recursive: true });
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const filename = `${randomUUID()}${ext}`;
    await writeFile(path.join(ListingsController.UPLOAD_DIR, filename), file.buffer);
    return { imageUrl: `/uploads/${filename}` };
  }

  @Post('upload-multiple')
  @UseInterceptors(FilesInterceptor('files', 5, { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadImages(@CurrentUser() user: AuthUser, @UploadedFiles() files?: Express.Multer.File[]) {
    if (user.role !== 'artisan') throw new ForbiddenException('Seuls les artisans peuvent publier une annonce');
    if (!files?.length) throw new BadRequestException('Au moins une image est requise');
    if (files.some((file) => !ListingsController.ALLOWED_MIME.includes(file.mimetype))) {
      throw new BadRequestException('Image invalide (formats acceptés : JPEG, PNG, WebP, GIF)');
    }
    if (process.env.NODE_ENV === 'production' && !this.storageService.isEnabled()) {
      throw new BadRequestException('Le stockage Cloudinary doit être configuré avant les uploads de production.');
    }
    if (this.storageService.isEnabled()) {
      const uploads = await Promise.all(files.map((file) =>
        this.storageService.uploadBuffer(file.buffer, 'artisanconnect/listings', 'image'),
      ));
      return { imageUrls: uploads.map((upload) => upload.url) };
    }
    await mkdir(ListingsController.UPLOAD_DIR, { recursive: true });
    const imageUrls = await Promise.all(files.map(async (file) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      const filename = `${randomUUID()}${ext}`;
      await writeFile(path.join(ListingsController.UPLOAD_DIR, filename), file.buffer);
      return `/uploads/${filename}`;
    }));
    return { imageUrls };
  }

  @Post(':id/sponsor')
  async sponsorListing(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const policy = await this.subscriptionsService.getSponsoringPolicy(user.id);
    if (!policy) {
      throw new ForbiddenException('La mise en avant est réservée aux artisans Premium');
    }
    const sponsored = await this.listingsService.countSponsoredBySeller(user.id);
    if (sponsored >= policy.maxSponsored) {
      throw new BadRequestException(`Votre plan permet de mettre en avant ${policy.maxSponsored} annonces à la fois`);
    }
    return this.listingsService.sponsor(id, user.id, policy.durationDays);
  }

  @Post(':id/sponsor/stop')
  async stopSponsoringListing(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.listingsService.stopSponsoring(id, user.id);
  }

  @Post()
  async createListing(@CurrentUser() user: AuthUser, @Body() listing: Partial<Listing>) {
    if (user.role !== 'artisan') {
      throw new ForbiddenException('Seuls les artisans peuvent publier une annonce');
    }
    // Le vendeur doit avoir une boutique active pour publier.
    await this.shopsService.assertShopActiveForSeller(user.id, listing.shopId, user.role);

    // L'offre gratuite plafonne le nombre d'annonces publiées simultanément.
    if (!(await this.subscriptionsService.isPremium(user.id))) {
      const activeListings = await this.listingsService.countActiveBySeller(user.id);
      if (activeListings >= FREE_PLAN_LISTING_LIMIT) {
        throw new BadRequestException(
          `L'offre gratuite est limitée à ${FREE_PLAN_LISTING_LIMIT} annonces actives. Désactivez une annonce ou passez à Premium pour publier sans limite.`,
        );
      }
    }
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
    @Query('city') city?: string,
    @Query('neighborhood') neighborhood?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number = 0,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number = 20,
  ) {
    return this.listingsService.searchCatalog(
      {
        q: query,
        category,
        type,
        city,
        neighborhood,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
      },
      skip,
      take,
    );
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


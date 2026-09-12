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

@Controller('listings')
export class ListingsController {
  constructor(
    private listingsService: ListingsService,
    private shopsService: ShopsService,
    private storageService: StorageService,
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

  @Post()
  async createListing(@CurrentUser() user: AuthUser, @Body() listing: Partial<Listing>) {
    if (user.role !== 'artisan') {
      throw new ForbiddenException('Seuls les artisans peuvent publier une annonce');
    }
    // Le vendeur doit avoir une boutique active pour publier.
    await this.shopsService.assertShopActiveForSeller(user.id, listing.shopId, user.role);
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


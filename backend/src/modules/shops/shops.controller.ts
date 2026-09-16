import { BadRequestException, Body, Controller, ForbiddenException, Get, NotFoundException, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ShopsService } from './shops.service.js';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator.js';
import type { ShopType } from '../../entities/shop.entity.js';
import { StorageService } from '../storage/storage.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { AdminGuard } from '../auth/admin.guard.js';

@Controller('shops')
export class ShopsController {
  constructor(private shopsService: ShopsService, private storageService: StorageService) {}

  private static readonly KYC_MIME = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/quicktime', 'application/pdf',
  ];

  @UseGuards(JwtAuthGuard)
  @Post('kyc/upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadKyc(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (user.role !== 'artisan') throw new ForbiddenException('Seuls les artisans peuvent envoyer des documents KYC');
    if (!file || !ShopsController.KYC_MIME.includes(file.mimetype)) {
      throw new BadRequestException('Document KYC invalide (JPEG, PNG, WebP, GIF, MP4, MOV ou PDF)');
    }
    if (!this.storageService.isEnabled()) {
      throw new BadRequestException(`Le stockage Cloudinary doit être configuré pour les documents KYC. Variables manquantes: ${this.storageService.missingConfiguration().join(', ')}`);
    }
    const resourceType = file.mimetype.startsWith('image/') ? 'image' : file.mimetype.startsWith('video/') ? 'video' : 'raw';
    try {
      const upload = await this.storageService.uploadBuffer(file.buffer, 'artisanconnect/kyc', resourceType === 'video' ? 'auto' : resourceType, 'authenticated');
      return { url: upload.url, publicId: upload.publicId, resourceType: upload.resourceType, format: upload.format };
    } catch {
      throw new BadRequestException('Cloudinary a refusé ce document KYC. Vérifiez les identifiants, le format et la taille du fichier.');
    }
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/:id/kyc-url')
  async getKycUrl(
    @Param('id') id: string,
    @Query('label') label: string,
  ) {
    if (!label) throw new BadRequestException('Le libellé du document est requis');
    return this.shopsService.getSignedKycUrl(id, label, this.storageService);
  }

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
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
  ) {
    return this.shopsService.create(user.id, body);
  }

  /** Route publique : pas d'auth, expose boutique active + annonces actives uniquement. */
  @Get(':id/public')
  async getPublic(@Param('id') id: string) {
    return this.shopsService.findPublicById(id);
  }

  @Get('mine')
  async mine(@CurrentUser() user: AuthUser) {
    return this.shopsService.findBySeller(user.id);
  }

  @Get(':id/detail')
  async get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const shop = await this.shopsService.findById(id);
    if (!shop) throw new NotFoundException('Boutique introuvable');
    if (shop.sellerId !== user.id && user.role !== 'admin') {
      throw new ForbiddenException('Accès refusé');
    }
    return shop;
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; category?: string; city?: string; neighborhood?: string; market?: string; latitude?: number; longitude?: number; deliveryMode?: 'workshop' | 'home'; deliveryMethods?: ('workshop' | 'home' | 'carrier')[]; mobileMoneyNumber?: string; momoNumber?: string; orangeMoneyNumber?: string; mobileMoneyProvider?: 'momo' | 'orange_money' | 'both'; isWomenLed?: boolean; isCooperative?: boolean },
  ) {
    return this.shopsService.update(id, user.id, body);
  }

  @Patch(':id/status')
  async setActive(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { active: boolean },
  ) {
    return this.shopsService.setActive(id, body.active);
  }
}

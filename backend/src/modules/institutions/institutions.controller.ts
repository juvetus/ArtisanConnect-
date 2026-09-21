import { BadRequestException, Body, Controller, Delete, Get, Header, Param, Patch, Post, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator.js';
import { InstitutionGuard } from './institution.guard.js';
import { ArtisanGuard } from './artisan.guard.js';
import { InstitutionsService } from './institutions.service.js';
import { StorageService } from '../storage/storage.service.js';

@Controller('institutions')
export class InstitutionsController {
  constructor(private readonly service: InstitutionsService, private readonly storage: StorageService) {}

  @UseGuards(InstitutionGuard)
  @Post('upload-media')
  @UseInterceptors(FilesInterceptor('files', 5, { limits: { fileSize: 25 * 1024 * 1024 } }))
  async uploadMedia(@UploadedFiles() files?: Express.Multer.File[]) {
    if (!files?.length) throw new BadRequestException('Au moins un fichier est requis');
    if (files.some((file) => !['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'].includes(file.mimetype))) {
      throw new BadRequestException('Format non accepté (JPG, PNG, WebP, GIF, MP4, WebM ou MOV)');
    }
    if (!this.storage.isEnabled()) throw new BadRequestException('Le stockage Cloudinary doit être configuré.');
    const uploads = await Promise.all(files.map((file) => this.storage.uploadBuffer(file.buffer, file.mimetype.startsWith('video/') ? 'artisanconnect/institutions/videos' : 'artisanconnect/institutions/images', file.mimetype.startsWith('video/') ? 'video' : 'image')));
    return { imageUrls: uploads.filter((_, index) => !files[index].mimetype.startsWith('video/')).map((upload) => upload.url), videoUrls: uploads.filter((_, index) => files[index].mimetype.startsWith('video/')).map((upload) => upload.url) };
  }

  @UseGuards(ArtisanGuard)
  @Get('resources')
  resources() { return this.service.listResources(); }

  @UseGuards(ArtisanGuard)
  @Get('programs')
  programs() { return this.service.listPrograms(); }

  @UseGuards(InstitutionGuard)
  @Get('my-resources')
  myResources(@CurrentUser() user: AuthUser) { return this.service.listMyResources(user.id); }

  @UseGuards(InstitutionGuard)
  @Get('my-programs')
  myPrograms(@CurrentUser() user: AuthUser) { return this.service.listMyPrograms(user.id); }

  @UseGuards(InstitutionGuard)
  @Post('resources')
  createResource(@CurrentUser() user: AuthUser, @Body() body: { title: string; description: string; type: 'training' | 'guide' | 'template'; theme: string; contentUrl?: string; imageUrls?: string[]; videoUrls?: string[] }) {
    return this.service.createResource(user.id, body);
  }

  @UseGuards(InstitutionGuard)
  @Post('programs')
  createProgram(@CurrentUser() user: AuthUser, @Body() body: { title: string; description: string; type: 'training' | 'support' | 'funding' | 'grant'; eligibility?: string; budget?: number; interventionZone?: string; startDate?: string; endDate?: string; objectives?: string; targetBeneficiaries?: string; impactIndicators?: string[]; imageUrls?: string[]; videoUrls?: string[] }) {
    return this.service.createProgram(user.id, body);
  }

  @UseGuards(InstitutionGuard)
  @Patch('resources/:id')
  updateResource(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: Partial<{ title: string; description: string; type: 'training' | 'guide' | 'template'; theme: string; contentUrl?: string; imageUrls?: string[]; videoUrls?: string[] }>,
  ) {
    return this.service.updateResource(user.id, id, body);
  }

  @UseGuards(InstitutionGuard)
  @Patch('programs/:id')
  updateProgram(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: Partial<{
      title: string;
      description: string;
      type: 'training' | 'support' | 'funding' | 'grant';
      eligibility?: string;
      budget?: number;
      interventionZone?: string;
      startDate?: string;
      endDate?: string;
      objectives?: string;
      targetBeneficiaries?: string;
      impactIndicators?: string[];
      imageUrls?: string[];
      videoUrls?: string[];
      status?: 'active' | 'closed';
    }>,
  ) {
    return this.service.updateProgram(user.id, id, body);
  }

  @UseGuards(InstitutionGuard)
  @Delete('resources/:id')
  deleteResource(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.deleteResource(user.id, id);
  }

  @UseGuards(InstitutionGuard)
  @Delete('programs/:id')
  deleteProgram(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.deleteProgram(user.id, id);
  }

  @UseGuards(InstitutionGuard)
  @Get('dashboard')
  dashboard(@CurrentUser() user: AuthUser) { return this.service.dashboard(user.id); }

  @UseGuards(InstitutionGuard)
  @Get('artisans')
  artisans() { return this.service.listArtisans(); }

  @UseGuards(InstitutionGuard)
  @Get('formalizations')
  formalizations(@CurrentUser() user: AuthUser) { return this.service.listFormalizations(user.id); }

  @Get('formalizations/me')
  myFormalization(@CurrentUser() user: AuthUser) { return this.service.getMyFormalization(user.id); }

  @Post('formalizations')
  submitFormalization(@CurrentUser() user: AuthUser, @Body() body: { businessName: string; registrationNumber?: string; taxId?: string; documentsUrl?: string }) {
    return this.service.submitFormalization(user.id, body);
  }

  @UseGuards(InstitutionGuard)
  @Patch('formalizations/:id/status')
  review(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { status: 'submitted' | 'in_review' | 'approved' | 'rejected'; notes?: string }) {
    return this.service.reviewFormalization(user.id, id, body.status, body.notes);
  }

  @UseGuards(InstitutionGuard)
  @Get('report.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="artisanconnect-rapport.csv"')
  report(@CurrentUser() user: AuthUser) { return this.service.csvReport(user.id); }
}
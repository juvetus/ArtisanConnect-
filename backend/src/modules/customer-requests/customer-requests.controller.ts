import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Public } from '../auth/public.decorator.js';
import { AdminGuard } from '../auth/admin.guard.js';
import { CustomerRequestsService } from './customer-requests.service.js';

@Controller('customer-requests')
@UseGuards(JwtAuthGuard)
export class CustomerRequestsController {
  constructor(private readonly service: CustomerRequestsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: { category: string; city: string; neighborhood?: string; description: string; budgetMin?: number; budgetMax?: number; requestedDate?: string; contactPreference?: 'platform' | 'whatsapp' | 'both'; contactPhone?: string }) {
    if (user.role !== 'client') {
      throw new ForbiddenException('La publication d’une demande est réservée aux clients. Les artisans peuvent répondre aux demandes depuis la page Opportunités.');
    }
    return this.service.create(user.id, body);
  }

  @Post(':id/photos')
  @UseInterceptors(FilesInterceptor('files', 5, { limits: { fileSize: 5 * 1024 * 1024 } }))
  addPhotos(@CurrentUser() user: AuthUser, @Param('id') id: string, @UploadedFiles() files: Express.Multer.File[]) {
    return this.service.addPhotos(user.id, id, files);
  }

  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.service.findMine(user.id);
  }

  @UseGuards(AdminGuard)
  @Get('admin/unmatched')
  unmatchedForAdmin() {
    return this.service.findUnmatchedForAdmin();
  }

  @UseGuards(AdminGuard)
  @Post('admin/:id/reply')
  replyAsAdmin(@Param('id') id: string, @Body('message') message: string) {
    return this.service.replyAsAdmin(id, message);
  }

  @Get('artisan/open')
  openForArtisan(@CurrentUser() user: AuthUser, @Query('category') category?: string, @Query('city') city?: string) {
    return this.service.findOpenForArtisan(user.id, category, city);
  }

  @Get('artisan/stats')
  stats(@CurrentUser() user: AuthUser) {
    return this.service.statsForArtisan(user.id);
  }

  @Public()
  @Get('artisan/:artisanId/public-stats')
  publicStats(@Param('artisanId') artisanId: string) {
    return this.service.publicStatsForArtisan(artisanId);
  }

  @Post(':id/respond')
  respond(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { price?: number; days?: number; message: string }) {
    return this.service.respond(user.id, id, body);
  }

  @Patch(':id/respond')
  updateResponse(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { price?: number; days?: number; message?: string }) {
    return this.service.updateResponse(user.id, id, body);
  }

  @Post(':id/responses/:artisanId/decision')
  decideResponse(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('artisanId') artisanId: string, @Body() body: { decision: 'accepted' | 'rejected' }) {
    return this.service.decideResponse(user.id, id, artisanId, body.decision);
  }

  @Post(':id/complete')
  complete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.complete(user.id, id);
  }

  @Post(':id/delivered')
  markDelivered(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.markDelivered(user.id, id);
  }

  @Post(':id/pay')
  pay(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { method: 'momo' | 'cash'; payerPhone?: string }) {
    return this.service.pay(user.id, id, body);
  }

  @Post(':id/pay/momo/confirm')
  confirmMomo(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.confirmMomo(user.id, id);
  }

  @Post(':id/pay/cash/confirm')
  confirmCash(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.confirmCash(user.id, id);
  }

  @Get(':id')
  getOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.findOneForUser(user.id, id);
  }
}

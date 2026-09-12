import { Body, Controller, Delete, Get, Param, Patch, Post, Res, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard.js';
import { AdminService } from './admin.service.js';
import { EmailService } from '../email/email.service.js';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator.js';
import { PdfService } from '../reports/pdf.service.js';
import type { Response } from 'express';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly emailService: EmailService,
    private readonly pdfService: PdfService,
  ) {}

  @Get('overview')
  getOverview() {
    return this.adminService.overview();
  }

  @Get('report.pdf')
  async reportPdf(@Res() response: Response) {
    const report = await this.adminService.overview();
    const pdf = await this.pdfService.adminReport(report);
    response.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="rapport-admin.pdf"' });
    response.end(pdf);
  }

  @Post('email/test')
  async sendTestEmail(@Body('to') to: string) {
    if (!to?.trim()) {
      return { sent: false, message: 'Une adresse e-mail est requise' };
    }

    const sent = await this.emailService.send({
      to: to.trim(),
      subject: '[ArtisanConnect] Test de configuration e-mail',
      text: 'La configuration e-mail ArtisanConnect fonctionne.',
      html: '<p>La configuration e-mail ArtisanConnect fonctionne.</p>',
    });

    return {
      sent,
      message: sent ? 'E-mail de test envoyé' : 'E-mail non envoyé ; vérifiez SMTP_ENABLED et les identifiants',
    };
  }

  @Get('users')
  getUsers() {
    return this.adminService.listUsers();
  }

  @Get('listings')
  getListings() {
    return this.adminService.listListings();
  }

  @Get('orders')
  getOrders() {
    return this.adminService.listOrders();
  }

  @Patch('listings/:id/status')
  updateListingStatus(
    @Param('id') id: string,
    @Body() body: { status: 'active' | 'inactive' },
  ) {
    return this.adminService.setListingStatus(id, body.status);
  }

  @Patch('users/:id/role')
  updateUserRole(@Param('id') id: string, @Body() body: { role: 'artisan' | 'client' }) {
    return this.adminService.setUserRole(id, body.role);
  }

  @Patch('users/:id/status')
  updateUserStatus(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    return this.adminService.setUserActive(id, body.isActive);
  }

  @Delete('users/:id')
  deleteUser(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.adminService.deleteUser(id, user.id);
  }

  @Get('shops')
  listShops() {
    return this.adminService.listShops();
  }

  @Patch('shops/:id/review')
  reviewShop(@Param('id') id: string, @Body() body: { approve: boolean; reason?: string }) {
    return this.adminService.reviewShop(id, body.approve, body.reason);
  }

  @Patch('shops/:id/status')
  updateShopStatus(@Param('id') id: string, @Body() body: { status: 'active' | 'suspended' }) {
    return this.adminService.setShopStatus(id, body.status);
  }

  @Delete('shops/:id')
  deleteShop(@Param('id') id: string) {
    return this.adminService.deleteShop(id);
  }

  @Delete('listings/:id')
  deleteListing(@Param('id') id: string) {
    return this.adminService.deleteListing(id);
  }
}

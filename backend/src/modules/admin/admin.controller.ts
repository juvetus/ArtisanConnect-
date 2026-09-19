import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Res, UseGuards } from '@nestjs/common';
import { AdminPanelGuard } from '../auth/admin-panel.guard.js';
import { AdminService } from './admin.service.js';
import { EmailService } from '../email/email.service.js';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator.js';
import { PdfService } from '../reports/pdf.service.js';
import type { Response } from 'express';

@Controller('admin')
@UseGuards(AdminPanelGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly emailService: EmailService,
    private readonly pdfService: PdfService,
  ) {}

  private assertAdmin(user: AuthUser) {
    if (user.role !== 'admin') throw new ForbiddenException('Action réservée aux administrateurs');
  }

  private assertEditor(user: AuthUser) {
    if (!['admin', 'editor'].includes(user.role)) throw new ForbiddenException('Action réservée aux administrateurs et éditeurs');
  }

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
  async sendTestEmail(@CurrentUser() user: AuthUser, @Body('to') to: string) {
    this.assertAdmin(user);
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
  getUsers(@CurrentUser() user: AuthUser) {
    this.assertAdmin(user);
    return this.adminService.listUsers();
  }

  @Post('users')
  createUser(@CurrentUser() user: AuthUser, @Body() body: {
    name: string;
    email: string;
    password: string;
    role: 'admin' | 'editor' | 'viewer' | 'artisan' | 'client' | 'institution';
    gender?: 'female' | 'male' | 'cooperative' | 'other';
  }) {
    this.assertAdmin(user);
    return this.adminService.createUser(body);
  }

  @Get('listings')
  getListings() {
    return this.adminService.listListings();
  }

  @Get('orders')
  getOrders() {
    return this.adminService.listOrders();
  }

  @Get('subscriptions')
  getSubscriptions() {
    return this.adminService.listSubscriptions();
  }

  @Patch('orders/:id/cancel')
  cancelOrder(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    this.assertAdmin(user);
    return this.adminService.cancelOrder(id);
  }

  @Patch('orders/:id/refund')
  refundOrder(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    this.assertAdmin(user);
    return this.adminService.refundOrder(id);
  }

  @Patch('listings/:id/status')
  updateListingStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { status: 'active' | 'inactive' },
  ) {
    this.assertEditor(user);
    return this.adminService.setListingStatus(id, body.status);
  }

  @Patch('users/:id/role')
  updateUserRole(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { role: 'admin' | 'editor' | 'viewer' | 'artisan' | 'client' | 'institution' }) {
    this.assertAdmin(user);
    return this.adminService.setUserRole(id, body.role);
  }

  @Patch('users/:id/status')
  updateUserStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { isActive: boolean }) {
    this.assertAdmin(user);
    return this.adminService.setUserActive(id, body.isActive);
  }

  @Delete('users/:id')
  deleteUser(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    this.assertAdmin(user);
    return this.adminService.deleteUser(id, user.id);
  }

  @Get('shops')
  listShops() {
    return this.adminService.listShops();
  }

  @Patch('shops/:id/review')
  reviewShop(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { approve: boolean; reason?: string }) {
    this.assertEditor(user);
    return this.adminService.reviewShop(id, body.approve, body.reason);
  }

  @Patch('shops/:id/status')
  updateShopStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { status: 'active' | 'suspended' }) {
    this.assertEditor(user);
    return this.adminService.setShopStatus(id, body.status);
  }

  @Patch('shops/:id/identity')
  verifyShopIdentity(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { verified: boolean }) {
    this.assertAdmin(user);
    return this.adminService.setShopIdentityVerified(id, Boolean(body.verified));
  }

  @Delete('shops/:id')
  deleteShop(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    this.assertAdmin(user);
    return this.adminService.deleteShop(id);
  }

  @Delete('listings/:id')
  deleteListing(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    this.assertAdmin(user);
    return this.adminService.deleteListing(id);
  }
}

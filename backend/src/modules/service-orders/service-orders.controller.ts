import { BadRequestException, Body, Controller, Get, Param, Post, Res, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type { Response } from 'express';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator.js';
import { AdminGuard } from '../auth/admin.guard.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ServiceOrdersService } from './service-orders.service.js';
import { PdfService } from '../reports/pdf.service.js';

@Controller('service-orders')
@UseGuards(JwtAuthGuard)
export class ServiceOrdersController {
  constructor(private readonly serviceOrdersService: ServiceOrdersService, private readonly pdfService: PdfService) {}

  @Post()
  createOrder(@CurrentUser() user: AuthUser, @Body() body: {
    serviceId: string;
    projectObjective: string;
    options?: Record<string, unknown>;
    inspirationLinks?: string;
    budgetMin?: number;
    budgetMax?: number;
    requestedDate?: string;
    deliveryMethod: 'home' | 'workshop' | 'carrier';
    deliveryAddress?: string;
    deliveryLatitude?: number;
    deliveryLongitude?: number;
    fileUrls?: string[];
    clientConfirmed: boolean;
    termsAccepted: boolean;
  }) {
    return this.serviceOrdersService.createOrder(user.id, body);
  }

  @Post(':id/files')
  @UseInterceptors(FilesInterceptor('files', 5, { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadOrderFiles(@CurrentUser() user: AuthUser, @Param('id') id: string, @UploadedFiles() files?: Express.Multer.File[]) {
    if (!files?.length) throw new BadRequestException('Au moins un fichier PDF est requis');
    if (files.some((file) => file.mimetype !== 'application/pdf')) {
      throw new BadRequestException('Seuls les fichiers PDF sont acceptés');
    }
    const directory = path.resolve(process.cwd(), 'uploads', 'service-orders');
    await mkdir(directory, { recursive: true });
    const fileUrls = await Promise.all(files.map(async (file) => {
      const filename = `${randomUUID()}.pdf`;
      await writeFile(path.join(directory, filename), file.buffer);
      return `/uploads/service-orders/${filename}`;
    }));
    return this.serviceOrdersService.attachFiles(user.id, id, fileUrls);
  }

  @Get('mine')
  getMyOrders(@CurrentUser() user: AuthUser) {
    return this.serviceOrdersService.findByClient(user.id);
  }

  @Get('artisan/mine')
  getArtisanOrders(@CurrentUser() user: AuthUser) {
    return this.serviceOrdersService.findByArtisan(user.id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/pending')
  getPendingOrders() {
    return this.serviceOrdersService.findPendingForAdmin();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('admin/:id/validate')
  validateOrder(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.serviceOrdersService.updateAdminStatus(user.id, id, 'sent_to_artisan');
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('admin/:id/request-details')
  requestDetails(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body('feedback') feedback: string,
  ) {
    if (!feedback?.trim()) throw new BadRequestException('Les précisions demandées sont obligatoires');
    return this.serviceOrdersService.updateAdminStatus(user.id, id, 'details_requested', feedback);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('admin/:id/reject')
  rejectOrder(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body('feedback') feedback: string,
  ) {
    if (!feedback?.trim()) throw new BadRequestException('La raison du refus est obligatoire');
    return this.serviceOrdersService.updateAdminStatus(user.id, id, 'rejected', feedback);
  }

  @Post(':id/quote')
  proposeQuote(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { proposedPrice: number; proposedDays: number; details: string; items?: { description: string; quantity: number; unitPrice: number }[]; terms?: string },
  ) {
    return this.serviceOrdersService.proposeQuote(user.id, id, {
      proposedPrice: Number(body.proposedPrice),
      proposedDays: Number(body.proposedDays),
      details: body.details,
      items: body.items,
      terms: body.terms,
    });
  }

  @Get(':id/quote')
  getQuote(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.serviceOrdersService.getQuote(user.id, id);
  }

  @Post(':id/quote/respond')
  respondToQuote(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { accepted: boolean; response?: string },
  ) {
    return this.serviceOrdersService.respondToQuote(user.id, id, body.accepted, body.response);
  }

  @Post(':id/artisan/respond')
  artisanRespond(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { accepted: boolean; feedback?: string },
  ) {
    return this.serviceOrdersService.artisanRespond(user.id, id, body.accepted, body.feedback);
  }

  @Post(':id/artisan/start')
  startOrder(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.serviceOrdersService.updateArtisanProgress(user.id, id, 'in_progress');
  }

  @Post(':id/artisan/deliver')
  deliverOrder(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body('fileUrls') fileUrls: string[]) {
    return this.serviceOrdersService.updateArtisanProgress(user.id, id, 'delivered', fileUrls);
  }

  @Post(':id/client/delivery-response')
  deliveryResponse(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { accepted: boolean; feedback?: string },
  ) {
    return this.serviceOrdersService.respondToDelivery(user.id, id, body.accepted, body.feedback);
  }

  @Get(':id/payments')
  getPayments(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.serviceOrdersService.getPayments(user.id, id);
  }

  @Post(':id/payments/:type/confirm-test')
  confirmTestPayment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('type') type: 'deposit' | 'balance',
  ) {
    if (type !== 'deposit' && type !== 'balance') {
      throw new BadRequestException('Type de paiement invalide');
    }
    return this.serviceOrdersService.confirmTestPayment(user.id, id, type);
  }

  @Get(':id/pdf')
  async orderPdf(@CurrentUser() user: AuthUser, @Param('id') id: string, @Res() response: Response) {
    const order = await this.serviceOrdersService.findByIdForUser(id, user.id);
    const pdf = await this.pdfService.order(order);
    response.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="commande-${id}.pdf"` });
    response.end(pdf);
  }

  @Get(':id/quote/pdf')
  async quotePdf(@CurrentUser() user: AuthUser, @Param('id') id: string, @Res() response: Response) {
    const order = await this.serviceOrdersService.findByIdForUser(id, user.id);
    const quote = await this.serviceOrdersService.getQuote(user.id, id);
    if (!quote) throw new BadRequestException('Aucun devis disponible');
    const pdf = await this.pdfService.quote(order, quote);
    response.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="devis-${id}.pdf"` });
    response.end(pdf);
  }

  @Get(':id/payments/:type/pdf')
  async paymentPdf(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('type') type: 'deposit' | 'balance', @Res() response: Response) {
    const order = await this.serviceOrdersService.findByIdForUser(id, user.id);
    const payments = await this.serviceOrdersService.getPayments(user.id, id);
    const payment = payments.find((item) => item.type === type);
    if (!payment) throw new BadRequestException('Paiement introuvable');
    const pdf = await this.pdfService.payment(order, payment);
    response.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="recu-${type}-${id}.pdf"` });
    response.end(pdf);
  }

  @Get(':id')
  getOrder(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.serviceOrdersService.findByIdForUser(id, user.id);
  }
}

import { Body, Controller, ForbiddenException, Get, Headers, Param, Patch, Post, RawBody, UseGuards } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator.js';
import { Public } from '../auth/public.decorator.js';
import { AdminPanelGuard } from '../auth/admin-panel.guard.js';
import { MomoService, type MomoWebhookHeaders } from '../momo/momo.service.js';
import { SubscriptionsService } from './subscriptions.service.js';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly momoService: MomoService,
  ) {}

  /** Les tarifs sont publics : la page d'offres doit s'afficher sans compte. */
  @Public()
  @Get('plans')
  async getPlans() {
    return this.subscriptionsService.getPlans();
  }

  @Post('plan/default')
  async createDefaultPlan() {
    return this.subscriptionsService.createDefaultPlan();
  }

  @Post('create/:planId')
  async createSubscription(
    @CurrentUser() user: AuthUser,
    @Param('planId') planId: string,
    @Body() body: { payerPhone?: string; promotionCode?: string },
  ) {
    return this.subscriptionsService.createSubscription(user.id, planId, body.payerPhone, body.promotionCode);
  }

  @Post('confirm/:referenceId')
  async confirmSubscription(@CurrentUser() user: AuthUser, @Param('referenceId') referenceId: string) {
    return this.subscriptionsService.confirmMomoPayment(user.id, referenceId);
  }

  @Get('user')
  async getMySubscriptions(@CurrentUser() user: AuthUser) {
    return this.subscriptionsService.findByUser(user.id);
  }

  @Get('status')
  async getPlanStatus(@CurrentUser() user: AuthUser) {
    return this.subscriptionsService.planStatus(user.id);
  }

  @UseGuards(AdminPanelGuard)
  @Get('admin/promotion-codes')
  listPromotionCodes(@CurrentUser() user: AuthUser) {
    if (user.role !== 'admin') throw new ForbiddenException('Action réservée aux administrateurs');
    return this.subscriptionsService.listPromotionCodes();
  }

  @UseGuards(AdminPanelGuard)
  @Post('admin/promotion-codes')
  createPromotionCode(@CurrentUser() user: AuthUser, @Body() body: { code: string; discountPercent: number; expiresAt?: string | null; maxUses?: number | null; allowedPlanSlugs?: string[] | null }) {
    if (user.role !== 'admin') throw new ForbiddenException('Action réservée aux administrateurs');
    return this.subscriptionsService.createPromotionCode(body);
  }

  @UseGuards(AdminPanelGuard)
  @Patch('admin/promotion-codes/:id/status')
  setPromotionCodeActive(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body('active') active: boolean) {
    if (user.role !== 'admin') throw new ForbiddenException('Action réservée aux administrateurs');
    return this.subscriptionsService.setPromotionCodeActive(id, Boolean(active));
  }

  @Public()
  @Post('webhook')
  async webhook(
    @Body() body: Record<string, unknown>,
    @Headers() headers: MomoWebhookHeaders,
    @RawBody() rawBody?: Buffer,
  ) {
    this.momoService.verifyWebhookSignature(headers, rawBody);
    return this.subscriptionsService.handleMomoWebhook(body);
  }
}

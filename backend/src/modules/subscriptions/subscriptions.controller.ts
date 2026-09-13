import { Body, Controller, Get, Headers, Param, Post, RawBody } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator.js';
import { Public } from '../auth/public.decorator.js';
import { MomoService, type MomoWebhookHeaders } from '../momo/momo.service.js';
import { SubscriptionsService } from './subscriptions.service.js';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly momoService: MomoService,
  ) {}

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
    @Body() body: { payerPhone?: string },
  ) {
    return this.subscriptionsService.createSubscription(user.id, planId, body.payerPhone);
  }

  @Post('confirm/:referenceId')
  async confirmSubscription(@CurrentUser() user: AuthUser, @Param('referenceId') referenceId: string) {
    return this.subscriptionsService.confirmMomoPayment(user.id, referenceId);
  }

  @Get('user')
  async getMySubscriptions(@CurrentUser() user: AuthUser) {
    return this.subscriptionsService.findByUser(user.id);
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

import { Body, Controller, Get, Headers, Param, Post, RawBody } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator.js';
import { MomoService, type MomoWebhookHeaders } from '../momo/momo.service.js';
import { Public } from '../auth/public.decorator.js';
import { PayoutsService } from './payouts.service.js';

@Controller('payouts')
export class PayoutsController {
  constructor(
    private readonly payoutsService: PayoutsService,
    private readonly momoService: MomoService,
  ) {}

  @Get('me')
  async getMyPayouts(@CurrentUser() user: AuthUser) {
    return this.payoutsService.findByArtisan(user.id);
  }

  @Post('manual/:artisanId')
  async createPayout(
    @CurrentUser() user: AuthUser,
    @Param('artisanId') artisanId: string,
    @Body() body: { amount: number; recipientPhone: string; orderId?: string },
  ) {
    if (user.role !== 'admin' && user.id !== artisanId) {
      throw new Error('Accès refusé');
    }
    return this.payoutsService.createPayout(artisanId, Number(body.amount), body.recipientPhone, body.orderId);
  }

  @Public()
  @Post('webhook')
  async webhook(
    @Body() body: Record<string, unknown>,
    @Headers() headers: MomoWebhookHeaders,
    @RawBody() rawBody?: Buffer,
  ) {
    this.momoService.verifyWebhookSignature(headers, rawBody);
    return this.payoutsService.handleMomoPayoutWebhook(body);
  }
}

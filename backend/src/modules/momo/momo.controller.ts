import { BadRequestException, Body, Controller, Get, Headers, Param, Post, Query, RawBody } from '@nestjs/common';
import { Public } from '../auth/public.decorator.js';
import { MomoService, type InitiateMomoPaymentDto, type MomoWebhookHeaders, type MomoWebhookPayload } from './momo.service.js';

@Controller('momo')
export class MomoController {
  constructor(private readonly momoService: MomoService) {}

  @Public()
  @Post('payment/initiate')
  async initiatePayment(@Body() body: InitiateMomoPaymentDto) {
    return this.momoService.initiateCollectionPayment(body);
  }

  @Public()
  @Get('payment/status/:referenceId')
  async getStatus(@Param('referenceId') referenceId: string) {
    return this.momoService.getPaymentStatus(referenceId);
  }

  @Public()
  @Get('payment/callback')
  async paymentCallback(@Query('referenceId') referenceId?: string, @Query('externalId') externalId?: string) {
    const reference = referenceId || externalId;
    if (!reference) throw new BadRequestException('Référence MoMo absente');
    return this.momoService.getPaymentStatus(reference);
  }

  @Public()
  @Post('webhook')
  async webhook(
    @Body() body: MomoWebhookPayload,
    @Headers() headers: MomoWebhookHeaders,
    @RawBody() rawBody?: Buffer,
  ) {
    this.momoService.verifyWebhookSignature(headers, rawBody);
    return this.momoService.handleWebhook(body);
  }
}

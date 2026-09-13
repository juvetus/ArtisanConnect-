import { Body, Controller, Get, Headers, Param, Post, RawBody } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator.js';
import { Public } from '../auth/public.decorator.js';
import type { CarrierWebhookHeaders, CreateDeliveryRideDto } from './delivery-carrier.service.js';
import { DeliveryOrdersService } from './delivery-orders.service.js';

@Controller('delivery')
export class DeliveryController {
  constructor(private readonly deliveryOrdersService: DeliveryOrdersService) {}

  @Post('orders/:orderId/ride')
  async createOrderRide(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
    @Body() body: {
      pickup?: Partial<CreateDeliveryRideDto['pickup']>;
      dropoff?: Partial<CreateDeliveryRideDto['dropoff']>;
      packageDetails?: CreateDeliveryRideDto['packageDetails'];
      instructions?: string;
    },
  ) {
    return this.deliveryOrdersService.createRideForOrder(orderId, user, body);
  }

  @Get('orders/:orderId/status')
  async getOrderDeliveryStatus(@CurrentUser() user: AuthUser, @Param('orderId') orderId: string) {
    return this.deliveryOrdersService.getOrderDeliveryStatus(orderId, user);
  }

  @Public()
  @Post('webhook')
  async webhook(
    @Body() body: Record<string, unknown>,
    @Headers() headers: CarrierWebhookHeaders,
    @RawBody() rawBody?: Buffer,
  ) {
    return this.deliveryOrdersService.handleCarrierWebhook(body, headers, rawBody);
  }
}

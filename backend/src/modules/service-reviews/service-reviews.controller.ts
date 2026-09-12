import { Body, Controller, DefaultValuePipe, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator.js';
import { Public } from '../auth/public.decorator.js';
import { ServiceReviewsService } from './service-reviews.service.js';

@Controller('service-reviews')
export class ServiceReviewsController {
  constructor(private readonly reviews: ServiceReviewsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: { orderId: string; rating: number; comment?: string }) {
    return this.reviews.create(user.id, body);
  }

  @Get('order/:orderId')
  findMine(@CurrentUser() user: AuthUser, @Param('orderId') orderId: string) {
    return this.reviews.findByOrder(orderId, user.id);
  }

  @Public()
  @Get('service/:serviceId')
  findByService(@Param('serviceId') serviceId: string, @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip = 0, @Query('take', new DefaultValuePipe(20), ParseIntPipe) take = 20) {
    return this.reviews.findByService(serviceId, skip, take);
  }

  @Public()
  @Get('rating/:serviceId')
  rating(@Param('serviceId') serviceId: string) {
    return this.reviews.getServiceRating(serviceId);
  }

  @Public()
  @Get('recipient/:recipientId')
  findByRecipient(@Param('recipientId') recipientId: string, @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip = 0, @Query('take', new DefaultValuePipe(20), ParseIntPipe) take = 20) {
    return this.reviews.findByRecipient(recipientId, skip, take);
  }

  @Public()
  @Get('recipient-rating/:recipientId')
  recipientRating(@Param('recipientId') recipientId: string) {
    return this.reviews.getRecipientRating(recipientId);
  }
}

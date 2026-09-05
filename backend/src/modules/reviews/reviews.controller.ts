import { Controller, Get, Post, Param, Body, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ReviewsService } from './reviews.service.js';
import { Public } from '../auth/public.decorator.js';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator.js';

@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Post()
  async createReview(
    @CurrentUser() user: AuthUser,
    @Body() body: { orderId: string; rating: number; comment?: string },
  ) {
    return this.reviewsService.createForOrder(
      user.id,
      body.orderId,
      Number(body.rating),
      body.comment?.trim() ?? '',
    );
  }

  @Get('order/:orderId')
  async getOrderReview(@Param('orderId') orderId: string) {
    return this.reviewsService.findByOrder(orderId);
  }

  @Public()
  @Get('recipient/:recipientId')
  async getRecipientReviews(
    @Param('recipientId') recipientId: string,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number = 0,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number = 20,
  ) {
    return this.reviewsService.findByRecipient(recipientId, skip, take);
  }

  @Public()
  @Get('rating/:recipientId')
  async getAverageRating(@Param('recipientId') recipientId: string) {
    return this.reviewsService.getAverageRating(recipientId);
  }
}



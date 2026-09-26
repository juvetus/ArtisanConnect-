import { Controller, Get, Param, Patch, Post, Query, DefaultValuePipe, ParseIntPipe, ForbiddenException } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator.js';

@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) { }

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number = 0,
    @Query('take', new DefaultValuePipe(30), ParseIntPipe) take: number = 30,
  ) {
    const [items, total] = await this.notificationsService.findByRecipient(user.id, skip, take);
    return { items, total, unreadCount: await this.notificationsService.unreadCount(user.id) };
  }

  @Get('unread')
  async unread(@CurrentUser() user: AuthUser) {
    return { unreadCount: await this.notificationsService.unreadCount(user.id) };
  }

  @Get('opportunities/unread')
  async unreadOpportunities(@CurrentUser() user: AuthUser) {
    return { unreadCount: await this.notificationsService.unreadOpportunityCount(user.id) };
  }

  @Post('opportunities/read-all')
  async markOpportunityNotificationsRead(@CurrentUser() user: AuthUser) {
    await this.notificationsService.markOpportunityNotificationsRead(user.id);
    return { success: true };
  }

  @Patch(':id/read')
  async markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.notificationsService.markAsRead(id, user.id);
    return { success: true };
  }

  @Post('read-all')
  async markAllRead(@CurrentUser() user: AuthUser) {
    await this.notificationsService.markAllAsRead(user.id);
    return { success: true };
  }
}

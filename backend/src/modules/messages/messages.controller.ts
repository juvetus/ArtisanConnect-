import { Controller, Get, Post, Patch, Param, Body, Query, DefaultValuePipe, ParseIntPipe, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MessagesService } from './messages.service.js';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator.js';

@Controller('messages')
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Post()
  async createMessage(
    @CurrentUser() user: AuthUser,
    @Body() body: { recipientId: string; orderId?: string; content: string },
  ) {
    const content = body.content?.trim();
    if (!content) throw new BadRequestException('Le message est vide');
    if (body.recipientId === user.id) {
      throw new BadRequestException('Impossible de s\u2019écrire à soi-même');
    }

    return this.messagesService.create({
      senderId: user.id,
      recipientId: body.recipientId,
      orderId: body.orderId,
      content,
    });
  }

  @Get('threads')
  async getThreads(@CurrentUser() user: AuthUser) {
    return this.messagesService.findThreads(user.id);
  }

  @Get('conversation/:otherUserId')
  async getConversation(
    @CurrentUser() user: AuthUser,
    @Param('otherUserId') otherUserId: string,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number = 0,
    @Query('take', new DefaultValuePipe(50), ParseIntPipe) take: number = 50,
  ) {
    await this.messagesService.markConversationAsRead(user.id, otherUserId);
    return this.messagesService.findByConversation(user.id, otherUserId, skip, take);
  }

  @Get('unread')
  async getUnreadCount(@CurrentUser() user: AuthUser) {
    return { unreadCount: await this.messagesService.getUnreadCount(user.id) };
  }

  @Patch(':id/read')
  async markAsRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const message = await this.messagesService.findById(id);
    if (!message) throw new NotFoundException('Message introuvable');
    if (message.recipientId !== user.id) {
      throw new ForbiddenException('Ce message ne vous est pas destiné');
    }
    return this.messagesService.markAsRead(id);
  }
}



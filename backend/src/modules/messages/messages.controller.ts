import { Controller, Get, Post, Patch, Param, Body, Query, DefaultValuePipe, ParseIntPipe, BadRequestException, ForbiddenException, NotFoundException, UploadedFile, UseInterceptors, StreamableFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createReadStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { MessagesService } from './messages.service.js';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator.js';

@Controller('messages')
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Post('service-order/:serviceOrderId/attachments')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadServiceAttachment(
    @CurrentUser() user: AuthUser,
    @Param('serviceOrderId') serviceOrderId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Fichier requis');
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/zip', 'text/plain'];
    if (!allowed.includes(file.mimetype)) throw new BadRequestException('Format non accepté');
    const extension = path.extname(file.originalname).toLowerCase() || '.bin';
    const filename = `${randomUUID()}${extension}`;
    const directory = path.resolve(process.cwd(), 'uploads', 'service-messages');
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, filename), file.buffer);
    return this.messagesService.attachServiceFile(user.id, serviceOrderId, `/messages/files/${filename}`);
  }

  @Get('files/:filename')
  async downloadServiceAttachment(@CurrentUser() user: AuthUser, @Param('filename') filename: string) {
    const file = await this.messagesService.getServiceFile(user.id, filename);
    return new StreamableFile(createReadStream(file.path), { type: file.mimeType });
  }

  @Post()
  async createMessage(
    @CurrentUser() user: AuthUser,
    @Body() body: { recipientId?: string; orderId?: string; serviceOrderId?: string; content: string },
  ) {
    const content = body.content?.trim();
    if (!content) throw new BadRequestException('Le message est vide');
    if (body.serviceOrderId) {
      return this.messagesService.createForServiceOrder(user.id, body.serviceOrderId, content);
    }
    if (!body.recipientId) throw new BadRequestException('Un destinataire est requis');
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

  @Get('service-order/:serviceOrderId')
  async getServiceOrderConversation(
    @CurrentUser() user: AuthUser,
    @Param('serviceOrderId') serviceOrderId: string,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number = 0,
    @Query('take', new DefaultValuePipe(50), ParseIntPipe) take: number = 50,
  ) {
    return this.messagesService.findByServiceOrder(user.id, serviceOrderId, skip, take);
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



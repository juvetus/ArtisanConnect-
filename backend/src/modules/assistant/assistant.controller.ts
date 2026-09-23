import { BadRequestException, Body, Controller, Get, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator.js';
import { AssistantService, type AssistantTask } from './assistant.service.js';

@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  @Post('generate')
  generate(@CurrentUser() user: AuthUser, @Body() body: { task: AssistantTask; input: string; language?: 'fr' | 'en'; context?: string }) {
    if (user.role !== 'artisan') throw new BadRequestException('Assistant réservé aux artisans');
    if (!body.input?.trim()) throw new BadRequestException('Décrivez votre besoin pour commencer');
    return this.assistant.generate(body);
  }

  @Post('generate-image')
  @UseInterceptors(FileInterceptor('referenceImage', { limits: { fileSize: 5 * 1024 * 1024 } }))
  generateImage(@CurrentUser() user: AuthUser, @Body() body: { prompt: string; style?: string; language?: 'fr' | 'en' }, @UploadedFile() referenceImage?: Express.Multer.File) {
    if (user.role !== 'artisan') throw new BadRequestException('Assistant réservé aux artisans');
    if (referenceImage && !['image/jpeg', 'image/png', 'image/webp'].includes(referenceImage.mimetype)) {
      throw new BadRequestException('Image de référence invalide (JPG, PNG ou WebP)');
    }
    return this.assistant.generateImage({ ...body, userId: user.id, referenceImage });
  }

  @Get('image-quota')
  imageQuota(@CurrentUser() user: AuthUser) {
    if (user.role !== 'artisan') throw new BadRequestException('Assistant réservé aux artisans');
    return this.assistant.getImageQuota(user.id);
  }
}

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

  @Post('suggest-client-request')
  suggestClientRequest(@CurrentUser() user: AuthUser, @Body() body: { description: string; category?: string; city?: string; neighborhood?: string; budgetMin?: number; budgetMax?: number; language?: 'fr' | 'en' }) {
    if (user.role !== 'client') throw new BadRequestException('La suggestion pour décrire un besoin est réservée aux clients. Les artisans peuvent préparer une réponse depuis Opportunités.');
    if (!body.description?.trim()) throw new BadRequestException('Saisissez une première description pour obtenir une suggestion');
    const context = [
      body.category ? `Métier : ${body.category}` : '',
      body.city ? `Ville : ${body.city}` : '',
      body.neighborhood ? `Quartier : ${body.neighborhood}` : '',
      body.budgetMin !== undefined || body.budgetMax !== undefined ? `Budget communiqué : ${body.budgetMin ?? 0} à ${body.budgetMax ?? 'non précisé'} FCFA` : '',
    ].filter(Boolean).join('\n');
    return this.assistant.generate({ task: 'demande_client', input: body.description.slice(0, 3000), context, language: body.language });
  }

  @Post('suggest-opportunity-reply')
  suggestOpportunityReply(@CurrentUser() user: AuthUser, @Body() body: { description: string; category: string; city: string; neighborhood?: string | null; budgetMin?: number | null; budgetMax?: number | null; requestedDate?: string | null; language?: 'fr' | 'en' }) {
    if (user.role !== 'artisan') throw new BadRequestException('Cette suggestion est réservée aux artisans');
    if (!body.description?.trim() || !body.category?.trim() || !body.city?.trim()) {
      throw new BadRequestException('La demande client est incomplète');
    }
    const context = [
      `Métier demandé : ${body.category}`,
      `Ville : ${body.city}`,
      body.neighborhood ? `Quartier : ${body.neighborhood}` : '',
      body.budgetMin !== null && body.budgetMin !== undefined || body.budgetMax !== null && body.budgetMax !== undefined
        ? `Budget client : ${body.budgetMin ?? 0} à ${body.budgetMax ?? 'non précisé'} FCFA`
        : '',
      body.requestedDate ? `Date souhaitée : ${body.requestedDate}` : '',
    ].filter(Boolean).join('\n');
    return this.assistant.generate({ task: 'reponse_opportunite', input: body.description.slice(0, 3000), context, language: body.language });
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

  @Post('analyze-photo')
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 5 * 1024 * 1024 } }))
  analyzePhoto(@CurrentUser() user: AuthUser, @Body('language') language: 'fr' | 'en' = 'fr', @Body('declaredTrade') declaredTrade = '', @UploadedFile() photo?: Express.Multer.File) {
    if (user.role !== 'artisan') throw new BadRequestException('Assistant réservé aux artisans');
    if (!photo || !['image/jpeg', 'image/png', 'image/webp'].includes(photo.mimetype)) {
      throw new BadRequestException('Ajoutez une photo JPG, PNG ou WebP (5 Mo maximum).');
    }
    return this.assistant.analyzeArtisanPhoto(photo, declaredTrade, language);
  }

  @Get('image-quota')
  imageQuota(@CurrentUser() user: AuthUser) {
    if (user.role !== 'artisan') throw new BadRequestException('Assistant réservé aux artisans');
    return this.assistant.getImageQuota(user.id);
  }
}

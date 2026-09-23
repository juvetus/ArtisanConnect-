import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
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
  generateImage(@CurrentUser() user: AuthUser, @Body() body: { prompt: string; style?: string; language?: 'fr' | 'en' }) {
    if (user.role !== 'artisan') throw new BadRequestException('Assistant réservé aux artisans');
    return this.assistant.generateImage(body);
  }
}

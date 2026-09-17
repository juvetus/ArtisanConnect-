import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CustomerRequestsService } from './customer-requests.service.js';

@Controller('customer-requests')
@UseGuards(JwtAuthGuard)
export class CustomerRequestsController {
  constructor(private readonly service: CustomerRequestsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: { category: string; city: string; neighborhood?: string; description: string; budgetMin?: number; budgetMax?: number; requestedDate?: string }) {
    return this.service.create(user.id, body);
  }

  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.service.findMine(user.id);
  }

  @Get('artisan/open')
  openForArtisan(@CurrentUser() user: AuthUser, @Query('category') category?: string, @Query('city') city?: string) {
    return this.service.findOpenForArtisan(user.id, category, city);
  }

  @Get('artisan/stats')
  stats(@CurrentUser() user: AuthUser) {
    return this.service.statsForArtisan(user.id);
  }

  @Post(':id/respond')
  respond(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { price?: number; days?: number; message: string }) {
    return this.service.respond(user.id, id, body);
  }

  @Post(':id/responses/:artisanId/decision')
  decideResponse(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('artisanId') artisanId: string, @Body() body: { decision: 'accepted' | 'rejected' }) {
    return this.service.decideResponse(user.id, id, artisanId, body.decision);
  }

  @Get(':id')
  getOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.findOneForUser(user.id, id);
  }
}

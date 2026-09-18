import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service.js';
import { Public } from '../auth/public.decorator.js';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { AdminGuard } from '../auth/admin.guard.js';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Public()
  @Post('events')
  record(
    @Body() body: { type: string; sessionId: string; label?: string; targetId?: string; city?: string },
    @CurrentUser() user?: AuthUser,
  ) {
    return this.analytics.record(body, user?.id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('funnel')
  funnel(@Query('days') days?: string) {
    return this.analytics.funnel(days ? Number(days) : 30);
  }
}

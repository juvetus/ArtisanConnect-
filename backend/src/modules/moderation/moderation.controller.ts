import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ModerationService } from './moderation.service.js';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { AdminGuard } from '../auth/admin.guard.js';
import type { ReportReason, ReportStatus, ReportTargetType } from '../../entities/report.entity.js';

@Controller('reports')
export class ModerationController {
  constructor(private reportsService: ModerationService) {}

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() body: { targetType: ReportTargetType; targetId: string; reason: ReportReason; details?: string },
  ) {
    return this.reportsService.create(user.id, body);
  }

  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.reportsService.findMine(user.id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin')
  listForModeration(@Query('status') status?: ReportStatus) {
    return this.reportsService.findForModeration(status);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch('admin/:id')
  moderate(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { status: ReportStatus; notes?: string },
  ) {
    return this.reportsService.moderate(id, user.id, body.status, body.notes);
  }
}

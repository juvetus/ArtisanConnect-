import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator.js';
import { InstitutionGuard } from '../institutions/institution.guard.js';
import { ProgramApplicationsService } from './program-applications.service.js';

@Controller('program-applications')
export class ProgramApplicationsController {
  constructor(private readonly service: ProgramApplicationsService) {}

  @Post(':programId')
  apply(@CurrentUser() user: AuthUser, @Param('programId') programId: string, @Body('motivation') motivation: string) {
    return this.service.apply(user.id, programId, motivation);
  }

  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.service.mine(user.id);
  }

  @UseGuards(InstitutionGuard)
  @Get('institution')
  institution(@CurrentUser() user: AuthUser) {
    return this.service.forInstitution(user.id);
  }

  @UseGuards(InstitutionGuard)
  @Patch(':id/status')
  review(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body('status') status: 'submitted' | 'in_review' | 'accepted' | 'rejected',
    @Body('notes') notes?: string,
  ) {
    return this.service.review(user.id, id, status, notes);
  }
}

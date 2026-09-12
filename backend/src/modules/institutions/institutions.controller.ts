import { Body, Controller, Delete, Get, Header, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator.js';
import { InstitutionGuard } from './institution.guard.js';
import { ArtisanGuard } from './artisan.guard.js';
import { InstitutionsService } from './institutions.service.js';

@Controller('institutions')
export class InstitutionsController {
  constructor(private readonly service: InstitutionsService) {}

  @UseGuards(ArtisanGuard)
  @Get('resources')
  resources() { return this.service.listResources(); }

  @UseGuards(ArtisanGuard)
  @Get('programs')
  programs() { return this.service.listPrograms(); }

  @UseGuards(InstitutionGuard)
  @Get('my-resources')
  myResources(@CurrentUser() user: AuthUser) { return this.service.listMyResources(user.id); }

  @UseGuards(InstitutionGuard)
  @Get('my-programs')
  myPrograms(@CurrentUser() user: AuthUser) { return this.service.listMyPrograms(user.id); }

  @UseGuards(InstitutionGuard)
  @Post('resources')
  createResource(@CurrentUser() user: AuthUser, @Body() body: { title: string; description: string; type: 'training' | 'guide' | 'template'; theme: string; contentUrl?: string }) {
    return this.service.createResource(user.id, body);
  }

  @UseGuards(InstitutionGuard)
  @Post('programs')
  createProgram(@CurrentUser() user: AuthUser, @Body() body: { title: string; description: string; type: 'training' | 'support' | 'funding' | 'grant'; eligibility?: string; budget?: number; interventionZone?: string; startDate?: string; endDate?: string; objectives?: string; targetBeneficiaries?: string; impactIndicators?: string[] }) {
    return this.service.createProgram(user.id, body);
  }

  @UseGuards(InstitutionGuard)
  @Patch('resources/:id')
  updateResource(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: Partial<{ title: string; description: string; type: 'training' | 'guide' | 'template'; theme: string; contentUrl?: string }>,
  ) {
    return this.service.updateResource(user.id, id, body);
  }

  @UseGuards(InstitutionGuard)
  @Patch('programs/:id')
  updateProgram(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: Partial<{
      title: string;
      description: string;
      type: 'training' | 'support' | 'funding' | 'grant';
      eligibility?: string;
      budget?: number;
      interventionZone?: string;
      startDate?: string;
      endDate?: string;
      objectives?: string;
      targetBeneficiaries?: string;
      impactIndicators?: string[];
      status?: 'active' | 'closed';
    }>,
  ) {
    return this.service.updateProgram(user.id, id, body);
  }

  @UseGuards(InstitutionGuard)
  @Delete('resources/:id')
  deleteResource(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.deleteResource(user.id, id);
  }

  @UseGuards(InstitutionGuard)
  @Delete('programs/:id')
  deleteProgram(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.deleteProgram(user.id, id);
  }

  @UseGuards(InstitutionGuard)
  @Get('dashboard')
  dashboard(@CurrentUser() user: AuthUser) { return this.service.dashboard(user.id); }

  @UseGuards(InstitutionGuard)
  @Get('artisans')
  artisans() { return this.service.listArtisans(); }

  @UseGuards(InstitutionGuard)
  @Get('formalizations')
  formalizations(@CurrentUser() user: AuthUser) { return this.service.listFormalizations(user.id); }

  @Get('formalizations/me')
  myFormalization(@CurrentUser() user: AuthUser) { return this.service.getMyFormalization(user.id); }

  @Post('formalizations')
  submitFormalization(@CurrentUser() user: AuthUser, @Body() body: { businessName: string; registrationNumber?: string; taxId?: string; documentsUrl?: string }) {
    return this.service.submitFormalization(user.id, body);
  }

  @UseGuards(InstitutionGuard)
  @Patch('formalizations/:id/status')
  review(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { status: 'submitted' | 'in_review' | 'approved' | 'rejected'; notes?: string }) {
    return this.service.reviewFormalization(user.id, id, body.status, body.notes);
  }

  @UseGuards(InstitutionGuard)
  @Get('report.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="artisanconnect-rapport.csv"')
  report(@CurrentUser() user: AuthUser) { return this.service.csvReport(user.id); }
}
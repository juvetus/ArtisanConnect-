import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator.js';
import { OpportunitiesService } from './opportunities.service.js';
import { OpportunityAlertsService } from './opportunity-alerts.service.js';

@Controller('opportunities')
export class OpportunitiesController {
  constructor(private readonly service: OpportunitiesService, private readonly alerts: OpportunityAlertsService) {}

  private admin(user: AuthUser, write = false) {
    if (!(write ? ['admin', 'editor'] : ['admin', 'editor', 'viewer']).includes(user.role)) throw new ForbiddenException('Accès réservé à l’administration');
  }

  private artisan(user: AuthUser) {
    if (user.role !== 'artisan') throw new ForbiddenException('Accès réservé aux artisans');
  }

  private offset(value?: string) {
    const number = Number(value ?? 0);
    if (!Number.isInteger(number) || number < 0 || number > 100000) throw new BadRequestException('Pagination invalide');
    return number;
  }

  private payload(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BadRequestException('Objet JSON requis');
    return value as Record<string, unknown>;
  }

  @Get('config')
  config() { return this.service.configuration(); }

  @Get('preferences')
  preferences(@CurrentUser() user: AuthUser) { this.artisan(user); return this.service.preferences(user.id); }

  @Patch('preferences')
  savePreferences(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    this.artisan(user); return this.service.savePreferences(user.id, this.payload(body));
  }

  @Get('admin/dashboard')
  async dashboard(@CurrentUser() user: AuthUser) {
    this.admin(user); return { ...await this.service.dashboard(), deliveries: await this.alerts.report() };
  }

  @Get('admin/notices')
  adminList(@CurrentUser() user: AuthUser, @Query('skip') skip?: string) {
    this.admin(user); return this.service.list(true, this.offset(skip));
  }

  @Post('admin/collect')
  collect(@CurrentUser() user: AuthUser) { this.admin(user, true); return this.service.queueCollection(); }

  @Post('admin/dispatch')
  dispatch(@CurrentUser() user: AuthUser) { this.admin(user, true); return this.alerts.dispatch(); }

  @Post('admin/notices')
  create(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    this.admin(user, true); return this.service.createManual(this.payload(body));
  }

  @Post('admin/notices/:id/analyze')
  analyze(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    this.admin(user, true); return this.service.analyze(id);
  }

  @Post('admin/notices/:id/publish')
  publish(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() body: Record<string, unknown>) {
    this.admin(user, true); return this.service.publish(id, user.id, this.payload(body));
  }

  @Post('admin/notices/:id/archive')
  archive(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    this.admin(user, true); return this.service.archive(id);
  }

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query('skip') skip?: string) {
    await this.service.assertEligible(user.id); return this.service.list(false, this.offset(skip));
  }

  @Get(':id')
  async detail(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.service.assertEligible(user.id); return this.service.get(id);
  }

  @Get(':id/groups')
  async groups(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.service.assertEligible(user.id); return this.service.groups(id, user.id);
  }

  @Post(':id/groups')
  createGroup(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() body: Record<string, unknown>) {
    return this.service.createGroup(id, user.id, this.payload(body));
  }

  @Post('groups/:id/join')
  join(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.joinGroup(id, user.id);
  }

  @Post('groups/:id/members/:memberId')
  review(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Param('memberId', ParseUUIDPipe) memberId: string, @Body() body: { accept?: boolean }) {
    const accept = this.payload(body).accept;
    if (typeof accept !== 'boolean') throw new BadRequestException('Décision invalide');
    return this.service.reviewMember(id, memberId, user.id, accept);
  }

  @Post('groups/:id/close')
  close(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    this.artisan(user); return this.service.closeGroup(id, user.id);
  }

  @Post('groups/:id/leave')
  leave(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    this.artisan(user); return this.service.leaveGroup(id, user.id);
  }
}

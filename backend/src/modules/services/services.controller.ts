import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { AdminGuard } from '../auth/admin.guard.js';
import { Public } from '../auth/public.decorator.js';
import { ServicesService } from './services.service.js';

@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  // Public endpoints
    @Public()
  @Get()
  async getApprovedServices(
    @Query('limit') limit: string = '20',
    @Query('skip') skip: string = '0',
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('city') city?: string,
  ) {
    return this.servicesService.getApprovedServices(parseInt(limit), parseInt(skip), { q, category, city });
  }

    @Public()
  @Get('search')
  async searchServices(
    @Query('q') query: string,
    @Query('category') category?: string,
    @Query('limit') limit: string = '20',
  ) {
    return this.servicesService.searchApprovedServices(query, category, parseInt(limit));
  }

    @Public()
  @Get('category/:category')
  async getByCategory(@Param('category') category: string) {
    return this.servicesService.getServicesByCategory(category);
  }

  // Artisan endpoints (protected)
  @UseGuards(JwtAuthGuard)
  @Post()
  async createService(
    @CurrentUser() user: AuthUser,
    @Body() body: {
      title: string;
      description: string;
      price?: number;
      priceMin?: number;
      priceMax?: number;
      estimatedDays: number;
      category: string;
      tags?: string[];
      fileUrls?: string[];
    },
  ) {
    return this.servicesService.createService(user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/list')
  async getMyServices(@CurrentUser() user: AuthUser) {
    return this.servicesService.getMyServices(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async updateService(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: Partial<{
      title: string;
      description: string;
      price?: number;
      priceMin?: number;
      priceMax?: number;
      estimatedDays: number;
      category: string;
      tags?: string[];
      fileUrls?: string[];
    }>,
  ) {
    return this.servicesService.updateService(user.id, id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/publish')
  async publishService(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.servicesService.publishService(user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteService(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.servicesService.deleteService(user.id, id);
  }

  // Admin endpoints
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/pending-validation')
  async getPendingValidationServices() {
    return this.servicesService.getPendingValidationServices();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/validation-requested')
  async getValidationRequestedServices() {
    return this.servicesService.getValidationRequestedServices();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('admin/:id/approve')
  async approveService(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.servicesService.approveService(user.id, id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('admin/:id/reject')
  async rejectService(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body('feedback') feedback: string,
  ) {
    if (!feedback?.trim()) {
      throw new BadRequestException('Feedback is required for rejection');
    }
    return this.servicesService.rejectService(user.id, id, feedback);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('admin/:id/request-revision')
  async requestValidationRevision(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body('feedback') feedback: string,
  ) {
    if (!feedback?.trim()) {
      throw new BadRequestException('Feedback is required for revision request');
    }
    return this.servicesService.requestValidationRevision(user.id, id, feedback);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/dashboard-stats')
  async getDashboardStats() {
    return this.servicesService.getDashboardStats();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/validation-history')
  async getValidationHistory(@Query('skip') skip = '0', @Query('take') take = '50') {
    return this.servicesService.getValidationHistory(Number(skip), Number(take));
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/export.csv')
  async exportServicesCsv() {
    return this.servicesService.exportServicesCsv();
  }

  @Public()
  @Get(':id')
  async getService(@Param('id') id: string) {
    return this.servicesService.getServiceById(id);
  }
}

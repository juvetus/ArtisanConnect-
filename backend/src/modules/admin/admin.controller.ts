import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard.js';
import { AdminService } from './admin.service.js';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  getOverview() {
    return this.adminService.overview();
  }

  @Get('users')
  getUsers() {
    return this.adminService.listUsers();
  }

  @Get('listings')
  getListings() {
    return this.adminService.listListings();
  }

  @Get('orders')
  getOrders() {
    return this.adminService.listOrders();
  }

  @Patch('listings/:id/status')
  updateListingStatus(
    @Param('id') id: string,
    @Body() body: { status: 'active' | 'inactive' },
  ) {
    return this.adminService.setListingStatus(id, body.status);
  }

  @Patch('users/:id/role')
  updateUserRole(@Param('id') id: string, @Body() body: { role: 'artisan' | 'client' }) {
    return this.adminService.setUserRole(id, body.role);
  }
}

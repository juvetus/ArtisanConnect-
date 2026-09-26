import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArtisanFormalization, InstitutionalProgram, InstitutionalResource, Listing, Order, ProgramApplication, User } from '../../entities/index.js';
import { InstitutionsController } from './institutions.controller.js';
import { InstitutionsService } from './institutions.service.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([User, Listing, Order, InstitutionalResource, InstitutionalProgram, ArtisanFormalization, ProgramApplication]), NotificationsModule],
  controllers: [InstitutionsController],
  providers: [InstitutionsService],
  exports: [InstitutionsService],
})
export class InstitutionsModule {}
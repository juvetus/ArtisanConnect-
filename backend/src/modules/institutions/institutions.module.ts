import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArtisanFormalization, InstitutionalProgram, InstitutionalResource, Listing, Order, ProgramApplication, User } from '../../entities/index.js';
import { InstitutionsController } from './institutions.controller.js';
import { InstitutionsService } from './institutions.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([User, Listing, Order, InstitutionalResource, InstitutionalProgram, ArtisanFormalization, ProgramApplication])],
  controllers: [InstitutionsController],
  providers: [InstitutionsService],
})
export class InstitutionsModule {}
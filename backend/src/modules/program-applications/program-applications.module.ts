import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProgramApplication } from '../../entities/program-application.entity.js';
import { InstitutionalProgram } from '../../entities/institutional-program.entity.js';
import { User } from '../../entities/user.entity.js';
import { ProgramApplicationsController } from './program-applications.controller.js';
import { ProgramApplicationsService } from './program-applications.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([ProgramApplication, InstitutionalProgram, User])],
  controllers: [ProgramApplicationsController],
  providers: [ProgramApplicationsService],
})
export class ProgramApplicationsModule {}

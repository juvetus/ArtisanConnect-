import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/index.js';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { StorageModule } from '../storage/storage.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([User]), StorageModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}


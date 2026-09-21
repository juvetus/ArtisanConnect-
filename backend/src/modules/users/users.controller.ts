import { BadRequestException, Controller, Get, Param, Patch, Body, ForbiddenException, NotFoundException, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service.js';
import { Public } from '../auth/public.decorator.js';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator.js';
import type { User } from '../../entities/index.js';
import { StorageService } from '../storage/storage.service.js';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService, private storageService: StorageService) {}

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadAvatar(@CurrentUser() currentUser: AuthUser, @UploadedFile() file?: Express.Multer.File) {
    if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      throw new BadRequestException('Image invalide (JPG, PNG ou WebP, 5 Mo maximum)');
    }
    if (!this.storageService.isEnabled()) {
      throw new BadRequestException(`Le stockage Cloudinary doit être configuré. Variables manquantes: ${this.storageService.missingConfiguration().join(', ')}`);
    }
    try {
      const upload = await this.storageService.uploadBuffer(file.buffer, 'artisanconnect/avatars', 'image');
      const user = await this.usersService.update(currentUser.id, { avatarUrl: upload.url });
      return { avatarUrl: user?.avatarUrl ?? upload.url };
    } catch {
      throw new BadRequestException('La photo n’a pas pu être téléversée.');
    }
  }

  @Public()
  @Get(':id')
  async getUser(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }

  @Patch(':id')
  async updateUser(
    @CurrentUser() currentUser: AuthUser,
    @Param('id') id: string,
    @Body() updateData: Partial<User>,
  ) {
    if (id !== currentUser.id) {
      throw new ForbiddenException('Vous ne pouvez modifier que votre profil');
    }
    // Ni le rôle, ni l'email, ni le mot de passe ne se changent par ce point d'entrée.
    const { role: _r, email: _e, passwordHash: _p, id: _i, ...safeData } = updateData;
    return this.usersService.update(id, safeData);
  }
}



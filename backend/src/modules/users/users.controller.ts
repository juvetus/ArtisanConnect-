import { Controller, Get, Param, Patch, Body, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { Public } from '../auth/public.decorator.js';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator.js';
import type { User } from '../../entities/index.js';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

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



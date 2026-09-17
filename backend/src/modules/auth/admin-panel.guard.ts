import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthUser } from './current-user.decorator.js';

@Injectable()
export class AdminPanelGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user as AuthUser | undefined;
    if (!user || !['admin', 'editor', 'viewer'].includes(user.role)) {
      throw new ForbiddenException("Accès réservé à l'équipe d'administration");
    }
    return true;
  }
}

import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthUser } from './current-user.decorator.js';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user as AuthUser | undefined;
    if (user?.role !== 'admin') {
      throw new ForbiddenException('Accès réservé aux administrateurs');
    }
    return true;
  }
}

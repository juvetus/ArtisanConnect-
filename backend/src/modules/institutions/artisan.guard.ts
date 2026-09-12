import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class ArtisanGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const user = context.switchToHttp().getRequest().user;
    if (user?.role !== 'artisan' && user?.role !== 'admin') {
      throw new ForbiddenException('Accès réservé aux artisans et administrateurs');
    }
    return true;
  }
}

import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class InstitutionGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const user = context.switchToHttp().getRequest().user;
    if (user?.role !== 'institution') {
      throw new ForbiddenException('Accès réservé aux institutions');
    }
    return true;
  }
}
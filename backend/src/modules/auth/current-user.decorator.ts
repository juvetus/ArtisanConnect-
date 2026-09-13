import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthUser {
  id: string;
  email: string;
  role: 'artisan' | 'client' | 'institution' | 'admin' | 'editor' | 'viewer';
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest().user,
);

import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { Public } from './public.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() body: { email: string; password: string; name: string; role?: 'artisan' | 'client' }) {
    return this.authService.register(body.email, body.password, body.name, body.role);
  }

  @Public()
  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }
}


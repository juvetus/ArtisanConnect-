import { Controller, Post, Get, Body, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service.js';
import { Public } from './public.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() body: { email?: string; phone?: string; password: string; name: string; role?: 'artisan' | 'client' | 'institution'; gender?: 'female' | 'male' | 'cooperative' | 'other' }) {
    return this.authService.register(body, body.password, body.name, body.role, body.gender);
  }

  @Public()
  @Post('login')
  async login(@Body() body: { identifier: string; password: string }) {
    return this.authService.login(body.identifier, body.password);
  }

  @Public()
  @Post('verify-email')
  async verifyEmailPost(@Body() body: { token: string }) {
    return this.authService.verifyEmail(body.token);
  }

  @Public()
  @Get('verify-email')
  async verifyEmailGet(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Public()
  @Post('verify-phone')
  async verifyPhone(@Body() body: { phone: string; code: string }) {
    return this.authService.verifyPhone(body.phone, body.code);
  }

  @Public()
  @Post('resend-verification')
  async resendVerification(@Body() body: { email?: string }, @Req() req: Request) {
    const user = (req as unknown as { user?: { id: string } }).user;
    return this.authService.resendVerification({
      userId: user?.id,
      email: body?.email,
    });
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Public()
  @Post('reset-password')
  async resetPassword(@Body() body: { token: string; password: string }) {
    return this.authService.resetPassword(body.token, body.password);
  }
}


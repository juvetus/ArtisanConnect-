import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service.js';

function createAuthService() {
  const usersService = {
    findByIdentifierWithPassword: vi.fn(),
    findByEmail: vi.fn(),
    findByPhone: vi.fn(),
    findByPhoneVerification: vi.fn(),
    validatePassword: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setVerificationToken: vi.fn(),
    setPhoneVerification: vi.fn(),
  };
  const jwtService = { sign: vi.fn(() => 'test-token') };
  const emailService = { sendVerificationEmail: vi.fn().mockResolvedValue(true) };
  const smsService = {};
  const configService = { get: vi.fn((_key: string, defaultValue?: string) => defaultValue) };
  const service = new AuthService(
    usersService as never,
    jwtService as never,
    emailService as never,
    smsService as never,
    configService as never,
  );

  return { service, usersService, jwtService };
}

describe('AuthService.register email validation', () => {
  it.each(['not-an-email', 'user@localhost', 'first..last@example.com', 'user @example.com'])('rejects malformed email %s', async (email) => {
    const { service, usersService } = createAuthService();

    await expect(service.register({ email }, 'Password123!', 'Test User')).rejects.toBeInstanceOf(BadRequestException);
    expect(usersService.create).not.toHaveBeenCalled();
  });

  it('rejects addresses longer than the email maximum', async () => {
    const { service, usersService } = createAuthService();
    const email = `${'a'.repeat(250)}@example.com`;

    await expect(service.register({ email }, 'Password123!', 'Test User')).rejects.toBeInstanceOf(BadRequestException);
    expect(usersService.create).not.toHaveBeenCalled();
  });

  it('creates an email account as unverified and reports whether the confirmation was sent', async () => {
    const { service, usersService } = createAuthService();
    usersService.findByEmail.mockResolvedValue(null);
    usersService.create.mockResolvedValue({ id: 'user-1', email: 'user@example.com', name: 'Test User', role: 'client' });

    const result = await service.register({ email: ' User@Example.com ' }, 'Password123!', 'Test User');

    expect(result.email).toBe('user@example.com');
    expect(result.verifiedEmail).toBe(false);
    expect(result.verificationEmailSent).toBe(true);
    expect(usersService.create).toHaveBeenCalledWith('user@example.com', 'Password123!', 'Test User', 'client', undefined);
  });
});

describe('AuthService.login verification gate', () => {
  it('requires email verification after the password has been validated', async () => {
    const { service, usersService, jwtService } = createAuthService();
    usersService.findByIdentifierWithPassword.mockResolvedValue({
      id: 'user-1', email: 'user@example.com', isActive: true, verifiedEmail: false, verifiedPhone: false,
    });
    usersService.validatePassword.mockResolvedValue(true);

    await expect(service.login('user@example.com', 'Password123!')).rejects.toThrow('Veuillez vérifier votre adresse email');
    expect(usersService.validatePassword).toHaveBeenCalledOnce();
    expect(jwtService.sign).not.toHaveBeenCalled();
  });

  it('does not reveal verification status when the password is incorrect', async () => {
    const { service, usersService } = createAuthService();
    usersService.findByIdentifierWithPassword.mockResolvedValue({
      id: 'user-1', email: 'user@example.com', isActive: true, verifiedEmail: false,
    });
    usersService.validatePassword.mockResolvedValue(false);

    await expect(service.login('user@example.com', 'wrong-password')).rejects.toThrow(UnauthorizedException);
    await expect(service.login('user@example.com', 'wrong-password')).rejects.not.toThrow('Veuillez vérifier');
  });

  it('requires phone verification when signing in with a phone number', async () => {
    const { service, usersService, jwtService } = createAuthService();
    usersService.findByIdentifierWithPassword.mockResolvedValue({
      id: 'user-1', email: '237699000000@phone.artisanconnect.local', phone: '+237699000000', isActive: true, verifiedPhone: false,
    });
    usersService.validatePassword.mockResolvedValue(true);

    await expect(service.login('+237699000000', 'Password123!')).rejects.toThrow('Veuillez vérifier votre numéro de téléphone');
    expect(jwtService.sign).not.toHaveBeenCalled();
  });

  it('issues a session after the email has been verified', async () => {
    const { service, usersService, jwtService } = createAuthService();
    usersService.findByIdentifierWithPassword.mockResolvedValue({
      id: 'user-1', email: 'user@example.com', name: 'Test User', role: 'client', isActive: true, verifiedEmail: true,
    });
    usersService.validatePassword.mockResolvedValue(true);

    const result = await service.login('USER@example.com', 'Password123!');

    expect(result.accessToken).toBe('test-token');
    expect(jwtService.sign).toHaveBeenCalledOnce();
  });

  it('issues a session after the phone has been verified', async () => {
    const { service, usersService, jwtService } = createAuthService();
    usersService.findByIdentifierWithPassword.mockResolvedValue({
      id: 'user-1', email: '237699000000@phone.artisanconnect.local', phone: '+237699000000', name: 'Test User', role: 'client', isActive: true, verifiedPhone: true,
    });
    usersService.validatePassword.mockResolvedValue(true);

    const result = await service.login('+237699000000', 'Password123!');

    expect(result.accessToken).toBe('test-token');
    expect(jwtService.sign).toHaveBeenCalledOnce();
  });
});

describe('AuthService.resendPhoneVerification', () => {
  it('returns a generic response for an unknown phone number', async () => {
    const { service, usersService } = createAuthService();
    usersService.findByPhone.mockResolvedValue(null);

    const result = await service.resendPhoneVerification('+237699000000');

    expect(result.success).toBe(true);
    expect(result).not.toHaveProperty('developmentOtp');
  });

  it('does not issue another code while the current code is active', async () => {
    const { service, usersService } = createAuthService();
    usersService.findByPhone.mockResolvedValue({ id: 'user-1', verifiedPhone: false });
    usersService.findByPhoneVerification.mockResolvedValue({ phoneVerificationExpires: new Date(Date.now() + 60_000) });

    const result = await service.resendPhoneVerification('+237699000000');

    expect(result.success).toBe(true);
    expect(usersService.setPhoneVerification).not.toHaveBeenCalled();
  });

  it('sends a new development code after the previous code expires', async () => {
    const { service, usersService } = createAuthService();
    usersService.findByPhone.mockResolvedValue({ id: 'user-1', verifiedPhone: false });
    usersService.findByPhoneVerification.mockResolvedValue({ phoneVerificationExpires: new Date(Date.now() - 1) });

    const result = await service.resendPhoneVerification('+237699000000');

    expect(result.success).toBe(true);
    expect(result.developmentOtp).toMatch(/^\d{6}$/);
    expect(usersService.setPhoneVerification).toHaveBeenCalledOnce();
  });
});
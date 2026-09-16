import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { createHash } from 'crypto';
import { UsersService } from '../users/users.service.js';
import { EmailService } from '../email/email.service.js';
import type { User } from '../../entities/user.entity.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private config: ConfigService,
  ) {}

  private getFrontendUrl(): string {
    return this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  }

  async sendVerificationEmailForUser(user: { id: string; email: string; name?: string }): Promise<boolean> {
    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 heures

    await this.usersService.setVerificationToken(user.id, token, expires);

    const verificationUrl = `${this.getFrontendUrl()}/verify-email?token=${token}`;
    const sent = await this.emailService.sendVerificationEmail({
      to: user.email,
      userName: user.name || 'Artisan / Utilisateur',
      verificationUrl,
    });

    if (!sent) {
      this.logger.warn(`Impossible d'envoyer l'email de vérification à ${user.email} (SMTP désactivé ou erreur)`);
    }

    return sent;
  }

  private normalizePhone(phone: string) {
    const trimmed = phone.trim();
    if (trimmed.startsWith('+')) return `+${trimmed.slice(1).replace(/\D/g, '')}`;
    if (trimmed.startsWith('00')) return `+${trimmed.slice(2).replace(/\D/g, '')}`;

    const digits = trimmed.replace(/\D/g, '');
    if (digits.startsWith('237')) return `+${digits}`;
    return `+237${digits.replace(/^0/, '')}`;
  }

  async register(contact: { email?: string; phone?: string }, password: string, name: string, role: 'artisan' | 'client' | 'institution' = 'client', gender?: 'female' | 'male' | 'cooperative' | 'other') {
    const email = contact.email?.trim().toLowerCase() || null;
    const phone = contact.phone ? this.normalizePhone(contact.phone) : null;
    if (!email && !phone) throw new BadRequestException('Un email ou un numéro de téléphone est requis');
    const existing = email ? await this.usersService.findByEmail(email) : await this.usersService.findByPhone(phone!);
    if (existing) {
      throw new ConflictException(email ? 'Email already registered' : 'Phone already registered');
    }

    const storedEmail = email ?? `${phone!.replace('+', '')}@phone.artisanconnect.local`;
    const user = await this.usersService.create(storedEmail, password, name, role, gender);
    if (phone) await this.usersService.update(user.id, { phone, whatsappPhone: phone });

    // Envoi de l'email de confirmation en arrière-plan sans bloquer l'inscription
    let developmentOtp: string | undefined;
    if (phone) {
      developmentOtp = await this.sendPhoneVerificationForUser(user.id, phone);
    } else {
      try {
        await this.sendVerificationEmailForUser(user);
      } catch (error) {
        this.logger.error(`Erreur lors de l'envoi du mail de vérification : ${(error as Error).message}`);
      }
    }

    return {
      id: user.id,
      email: user.email,
      phone,
      name: user.name,
      role: user.role,
      gender: user.gender,
      verifiedEmail: false,
      verifiedPhone: false,
      ...(developmentOtp ? { developmentOtp } : {}),
    };
  }

  async login(identifier: string, password: string) {
    const normalized = identifier.includes('@') ? identifier.toLowerCase().trim() : this.normalizePhone(identifier);
    const user = await this.usersService.findByIdentifierWithPassword(normalized);
    
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.usersService.validatePassword(user, password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        whatsappPhone: user.whatsappPhone,
        name: user.name,
        role: user.role,
        gender: user.gender,
        verifiedEmail: user.verifiedEmail ?? false,
        verifiedPhone: user.verifiedPhone ?? false,
      },
    };
  }

  private async sendPhoneVerificationForUser(userId: string, phone: string) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    await this.usersService.setPhoneVerification(userId, createHash('sha256').update(code).digest('hex'), new Date(Date.now() + 10 * 60 * 1000));
    this.logger.log(`Phone OTP for ${phone}: ${code}`);
    return this.config.get('PHONE_OTP_MODE', 'mock') === 'mock' && this.config.get('NODE_ENV') !== 'production' ? code : undefined;
  }

  async verifyPhone(phone: string, code: string) {
    const user = await this.usersService.findByPhone(this.normalizePhone(phone));
    if (!user) throw new BadRequestException('Numéro introuvable');
    const candidate = createHash('sha256').update(code).digest('hex');
    const record = await this.usersService.findByPhoneVerification(user.id);
    if (!record || !record.phoneVerificationExpires || !record.phoneVerificationCodeHash || record.phoneVerificationExpires < new Date() || record.phoneVerificationCodeHash !== candidate) throw new BadRequestException('Code invalide ou expiré');
    const updated = await this.usersService.markPhoneVerified(user.id);
    return { success: true, message: 'Votre numéro a été vérifié avec succès.', user: { ...updated, verifiedPhone: true } };
  }

  async verifyEmail(token: string) {
    if (!token) {
      throw new BadRequestException('Le jeton de vérification est requis');
    }

    const user = await this.usersService.findByVerificationToken(token);
    if (!user) {
      throw new BadRequestException('Lien de vérification invalide ou expiré.');
    }

    if (user.emailVerificationExpires && new Date(user.emailVerificationExpires) < new Date()) {
      throw new BadRequestException('Ce lien de vérification a expiré. Veuillez demander un nouveau lien.');
    }

    const updatedUser = await this.usersService.markEmailVerified(user.id);
    return {
      success: true,
      message: 'Votre adresse email a été vérifiée avec succès.',
      user: {
        id: updatedUser?.id ?? user.id,
        email: updatedUser?.email ?? user.email,
        name: updatedUser?.name ?? user.name,
        role: updatedUser?.role ?? user.role,
        gender: updatedUser?.gender ?? user.gender,
        verifiedEmail: true,
      },
    };
  }

  async resendVerification(identifier: { userId?: string; email?: string }) {
    let user: User | null = null;
    if (identifier.userId) {
      user = await this.usersService.findById(identifier.userId);
    } else if (identifier.email) {
      user = await this.usersService.findByEmail(identifier.email);
    }

    if (!user) {
      throw new BadRequestException('Utilisateur introuvable');
    }

    if (user.verifiedEmail) {
      return { success: true, message: 'Votre adresse email est déjà vérifiée.' };
    }

    await this.sendVerificationEmailForUser(user);

    return {
      success: true,
      message: 'Un nouvel email de confirmation vous a été envoyé.',
    };
  }

  async forgotPassword(email: string) {
    if (!email) {
      throw new BadRequestException('L’adresse email est requise.');
    }

    const user = await this.usersService.findByEmail(email.toLowerCase().trim());
    if (user && user.isActive) {
      const token = randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

      await this.usersService.setPasswordResetToken(user.id, token, expires);

      const resetUrl = `${this.getFrontendUrl()}/reset-password?token=${token}`;
      try {
        await this.emailService.sendPasswordResetEmail({
          to: user.email,
          userName: user.name || 'Utilisateur ArtisanConnect',
          resetUrl,
        });
      } catch (error) {
        this.logger.error(`Erreur lors de l'envoi du mail de réinitialisation : ${(error as Error).message}`);
      }
    }

    // Toujours renvoyer une réponse générique positive pour éviter le dénombrement d'utilisateurs
    return {
      success: true,
      message: 'Si cette adresse email est associée à un compte, vous recevrez un lien de réinitialisation dans quelques instants.',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    if (!token) {
      throw new BadRequestException('Le jeton de réinitialisation est requis.');
    }
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('Le mot de passe doit contenir au moins 8 caractères.');
    }

    const user = await this.usersService.findByPasswordResetToken(token);
    if (!user) {
      throw new BadRequestException('Lien de réinitialisation invalide ou déjà utilisé.');
    }

    if (user.passwordResetExpires && new Date(user.passwordResetExpires) < new Date()) {
      throw new BadRequestException('Ce lien de réinitialisation a expiré. Veuillez refaire une demande.');
    }

    await this.usersService.resetPassword(user.id, newPassword);

    return {
      success: true,
      message: 'Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.',
    };
  }

  async validateToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}


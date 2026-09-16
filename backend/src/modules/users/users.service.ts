import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/index.js';
import bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { phone } });
  }

  async findByPhoneVerification(userId: string): Promise<Pick<User, 'phoneVerificationCodeHash' | 'phoneVerificationExpires'> | null> {
    return this.usersRepository.findOne({
      where: { id: userId },
      select: { phoneVerificationCodeHash: true, phoneVerificationExpires: true },
    });
  }

  async findByIdentifierWithPassword(identifier: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: [{ email: identifier }, { phone: identifier }],
      select: { id: true, email: true, phone: true, whatsappPhone: true, name: true, role: true, gender: true, passwordHash: true, isActive: true, verifiedEmail: true, verifiedPhone: true },
    });
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      select: { id: true, email: true, phone: true, whatsappPhone: true, name: true, role: true, gender: true, passwordHash: true, isActive: true, verifiedEmail: true, verifiedPhone: true },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByVerificationToken(token: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { emailVerificationToken: token },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        gender: true,
        verifiedEmail: true,
        emailVerificationToken: true,
        emailVerificationExpires: true,
      },
    });
  }

  async setVerificationToken(userId: string, token: string, expires: Date): Promise<void> {
    await this.usersRepository.update(userId, {
      emailVerificationToken: token,
      emailVerificationExpires: expires,
    });
  }

  async markEmailVerified(userId: string): Promise<User | null> {
    await this.usersRepository.update(userId, {
      verifiedEmail: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
    });
    return this.findById(userId);
  }

  async findByPasswordResetToken(token: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { passwordResetToken: token },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        gender: true,
        passwordResetToken: true,
        passwordResetExpires: true,
      },
    });
  }

  async setPasswordResetToken(userId: string, token: string, expires: Date): Promise<void> {
    await this.usersRepository.update(userId, {
      passwordResetToken: token,
      passwordResetExpires: expires,
    });
  }

  async resetPassword(userId: string, newPasswordPlain: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPasswordPlain, 10);
    await this.usersRepository.update(userId, {
      passwordHash: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
    });
  }

  async create(email: string, password: string, name: string, role: 'artisan' | 'client' | 'institution' | 'admin' | 'editor' | 'viewer' = 'client', gender?: 'female' | 'male' | 'cooperative' | 'other'): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.usersRepository.create({
      email,
      passwordHash: hashedPassword,
      name,
      role,
      gender: gender ?? null,
    });
    return this.usersRepository.save(user);
  }

  async setPhoneVerification(userId: string, codeHash: string, expires: Date): Promise<void> {
    await this.usersRepository.update(userId, { phoneVerificationCodeHash: codeHash, phoneVerificationExpires: expires });
  }

  async markPhoneVerified(userId: string): Promise<User | null> {
    await this.usersRepository.update(userId, { verifiedPhone: true, phoneVerificationCodeHash: null, phoneVerificationExpires: null });
    return this.findById(userId);
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }

  async update(id: string, updateData: Partial<User>): Promise<User | null> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) return null;
    Object.assign(user, updateData);
    await this.usersRepository.save(user);
    return this.findById(id);
  }
}

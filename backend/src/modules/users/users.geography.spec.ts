import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity.js';
import { UsersService } from './users.service.js';
import { validateProfileGeography } from '../../geography.js';

describe('account geographic persistence', () => {
  async function setup() {
    const repo = {
      create: vi.fn((data: Partial<User>) => data),
      save: vi.fn(async (data: Partial<User>) => data),
      findOne: vi.fn(async () => ({ id: 'test', city: 'Yaoundé', district: 'Yaoundé I', neighborhood: 'Bastos' })),
    };
    const module = await Test.createTestingModule({ providers: [
      UsersService, { provide: getRepositoryToken(User), useValue: repo },
    ] }).compile();
    return { service: module.get(UsersService), repo };
  }

  it('stores trimmed values at creation, including freely entered neighborhoods', async () => {
    const { service, repo } = await setup();
    await service.create('test@example.test', 'test-password', 'Test', 'artisan', undefined, {
      city: ' Yaoundé ', district: ' Yaoundé VII ', neighborhood: ' Quartier libre ',
    });
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ city: 'Yaoundé', district: 'Yaoundé VII', neighborhood: 'Quartier libre' }));
  });

  it('rejects invalid geography before account persistence', async () => {
    const { service, repo } = await setup();
    await expect(service.create('test@example.test', 'test-password', 'Test', 'artisan', undefined, { city: 'x'.repeat(151) })).rejects.toThrow('invalide');
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('allows clearing a location without clearing unspecified fields', async () => {
    const { service, repo } = await setup();
    await service.update('test', { district: '' });
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ city: 'Yaoundé', district: null, neighborhood: 'Bastos' }));
    expect(validateProfileGeography({})).toEqual({});
  });

  it('preserves geography in the login repository selection', async () => {
    const { service, repo } = await setup();
    await service.findByIdentifierWithPassword('test@example.test');
    expect(repo.findOne).toHaveBeenCalledWith(expect.objectContaining({
      select: expect.objectContaining({ city: true, district: true, neighborhood: true }),
    }));
  });
});

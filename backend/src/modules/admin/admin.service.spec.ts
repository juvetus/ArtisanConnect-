import { describe, expect, it, vi } from 'vitest';
import { AdminService } from './admin.service.js';

function createAdminService(existingUser: object | null = null) {
  const users = {
    findOne: vi.fn().mockResolvedValue(existingUser),
    update: vi.fn().mockResolvedValue(undefined),
    create: vi.fn((user) => user),
    save: vi.fn().mockImplementation(async (user) => user),
  };
  const config = {
    get: vi.fn((key: string, defaultValue?: string) => {
      const values: Record<string, string> = {
        ADMIN_EMAIL: ' Admin@Example.com ',
        ADMIN_PASSWORD: 'admin-password',
      };
      return values[key] ?? defaultValue;
    }),
  };
  const service = new AdminService(
    users as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    config as never,
  );

  return { service, users };
}

describe('AdminService.onModuleInit', () => {
  it('creates a normalized, verified admin account when none exists', async () => {
    const { service, users } = createAdminService();

    await service.onModuleInit();

    expect(users.findOne).toHaveBeenCalledWith({ where: { email: 'admin@example.com' } });
    expect(users.create).toHaveBeenCalledWith(expect.objectContaining({
      email: 'admin@example.com',
      role: 'admin',
      verifiedEmail: true,
    }));
    expect(users.save).toHaveBeenCalledOnce();
  });

  it('verifies an existing admin account without changing its password', async () => {
    const { service, users } = createAdminService({
      id: 'admin-id',
      role: 'admin',
      verifiedEmail: false,
    });

    await service.onModuleInit();

    expect(users.update).toHaveBeenCalledWith('admin-id', { verifiedEmail: true });
    expect(users.save).not.toHaveBeenCalled();
  });

  it('does not modify an existing non-admin account using the configured email', async () => {
    const { service, users } = createAdminService({
      id: 'user-id',
      role: 'client',
      verifiedEmail: false,
    });

    await service.onModuleInit();

    expect(users.update).not.toHaveBeenCalled();
    expect(users.save).not.toHaveBeenCalled();
  });
});

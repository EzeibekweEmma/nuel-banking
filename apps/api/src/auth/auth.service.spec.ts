import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const user = { id: 'user-1', email: 'customer@example.com', passwordHash: '$2b$12$EjcW2b8l5RlXKiYgwsnC6e9RV26mR2HcB3XFZ8ILjXKGE2KLe3Ceq', firstName: 'Ada', lastName: 'Okafor', role: UserRole.CUSTOMER, createdAt: new Date(), updatedAt: new Date() };
  const prisma = { user: { findUnique: jest.fn(), create: jest.fn() }, refreshToken: { create: jest.fn(), findMany: jest.fn(), delete: jest.fn() }, auditLog: { create: jest.fn() } };
  const jwt = { signAsync: jest.fn(), verifyAsync: jest.fn() };
  const config = { getOrThrow: jest.fn().mockReturnValue('test-secret') };
  const service = new AuthService(prisma as never, jwt as never as JwtService, config as never as ConfigService);

  beforeEach(() => jest.clearAllMocks());

  it('registers a customer with a hashed password and token pair', async () => {
    prisma.user.findUnique.mockResolvedValue(null); prisma.user.create.mockResolvedValue(user); jwt.signAsync.mockResolvedValueOnce('access').mockResolvedValueOnce('refresh'); prisma.refreshToken.create.mockResolvedValue({});
    await expect(service.register({ email: user.email, firstName: user.firstName, lastName: user.lastName, password: 'SecurePassword123' })).resolves.toEqual({ accessToken: 'access', refreshToken: 'refresh' });
    expect(prisma.user.create.mock.calls[0][0].data.passwordHash).not.toBe('SecurePassword123');
    expect(prisma.refreshToken.create).toHaveBeenCalled();
  });

  it('rejects invalid credentials', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.login({ email: user.email, password: 'SecurePassword123' })).rejects.toThrow('Invalid email or password');
  });
});

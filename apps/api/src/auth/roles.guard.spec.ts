import { ExecutionContext } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue([UserRole.ADMIN]) };
  const guard = new RolesGuard(reflector as never);
  const context = (role: UserRole): ExecutionContext => ({ getHandler: () => undefined, getClass: () => undefined, switchToHttp: () => ({ getRequest: () => ({ user: { id: 'user', email: 'user@example.com', role } }) }) }) as never;
  it('permits admins', () => expect(guard.canActivate(context(UserRole.ADMIN))).toBe(true));
  it('denies customers', () => expect(guard.canActivate(context(UserRole.CUSTOMER))).toBe(false));
});

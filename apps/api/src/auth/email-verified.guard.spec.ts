import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { EmailVerifiedGuard } from "./email-verified.guard";

describe("EmailVerifiedGuard", () => {
  const prisma = { user: { findUnique: jest.fn() } };
  const guard = new EmailVerifiedGuard(prisma as never);
  const context = {
    switchToHttp: () => ({
      getRequest: () => ({
        user: {
          id: "user-1",
          email: "customer@example.com",
          role: UserRole.CUSTOMER,
        },
      }),
    }),
  } as ExecutionContext;

  beforeEach(() => jest.clearAllMocks());

  it("allows a user whose email is verified", async () => {
    prisma.user.findUnique.mockResolvedValue({ emailVerifiedAt: new Date() });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it("blocks sensitive operations until the email is verified", async () => {
    prisma.user.findUnique.mockResolvedValue({ emailVerifiedAt: null });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});

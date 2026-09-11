import { AuditAction, UserRole } from "@prisma/client";
import { UsersService } from "./users.service";

describe("UsersService", () => {
  const updatedUser = {
    id: "user-1",
    email: "ada@example.com",
    firstName: "Ada",
    lastName: "Okafor",
    role: UserRole.CUSTOMER,
    emailVerifiedAt: new Date(),
    createdAt: new Date(),
  };
  const prisma = {
    user: { findUnique: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const prismaClient = {
    ...prisma,
    $transaction: jest.fn(
      async (callback: (transaction: typeof prisma) => Promise<unknown>) =>
        callback(prisma),
    ),
  };
  const service = new UsersService(prismaClient as never);

  beforeEach(() => jest.clearAllMocks());

  it("trims and updates the customer's profile with an audit record", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: updatedUser.id });
    prisma.user.update.mockResolvedValue(updatedUser);
    prisma.auditLog.create.mockResolvedValue({});

    await expect(
      service.updateProfile(updatedUser.id, {
        firstName: "  Ada ",
        lastName: " Okafor  ",
      }),
    ).resolves.toBe(updatedUser);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { firstName: "Ada", lastName: "Okafor" },
      }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: AuditAction.PROFILE_UPDATED }),
    });
  });
});

import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { UserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
  const user = {
    id: "user-1",
    email: "customer@example.com",
    passwordHash:
      "$2b$12$EjcW2b8l5RlXKiYgwsnC6e9RV26mR2HcB3XFZ8ILjXKGE2KLe3Ceq",
    firstName: "Ada",
    lastName: "Okafor",
    role: UserRole.CUSTOMER,
    emailVerifiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const prisma = {
    user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    refreshToken: {
      create: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    passwordResetToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    emailVerificationToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    auditLog: { create: jest.fn(), createMany: jest.fn() },
  };
  const transaction = jest.fn(
    async (
      callback: (tx: typeof prisma) => Promise<unknown>,
    ): Promise<unknown> => callback(prisma),
  );
  const prismaClient = { ...prisma, $transaction: transaction };
  const jwt = { signAsync: jest.fn(), verifyAsync: jest.fn() };
  const config = {
    getOrThrow: jest.fn().mockReturnValue("test-secret"),
    get: jest.fn(),
  };
  const emailOutbox = { enqueue: jest.fn().mockResolvedValue(undefined) };
  const service = new AuthService(
    prismaClient as never,
    jwt as never as JwtService,
    config as never as ConfigService,
    emailOutbox as never,
  );

  beforeEach(() => jest.clearAllMocks());
  afterEach(() => jest.restoreAllMocks());

  it("registers a customer with a hashed password and token pair", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(user);
    jwt.signAsync
      .mockResolvedValueOnce("access")
      .mockResolvedValueOnce("refresh");
    prisma.refreshToken.create.mockResolvedValue({});
    prisma.emailVerificationToken.create.mockResolvedValue({});
    prisma.auditLog.createMany.mockResolvedValue({ count: 2 });
    await expect(
      service.register({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        password: "SecurePassword123",
      }),
    ).resolves.toEqual({
      accessToken: "access",
      refreshToken: "refresh",
      emailVerificationRequired: true,
    });
    expect(prisma.user.create.mock.calls[0][0].data.passwordHash).not.toBe(
      "SecurePassword123",
    );
    const verificationHash = prisma.emailVerificationToken.create.mock
      .calls[0][0].data.tokenHash as string;
    expect(verificationHash).toHaveLength(64);
    expect(emailOutbox.enqueue).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({ tokenHash: verificationHash }),
    );
    expect(prisma.refreshToken.create).toHaveBeenCalled();
  });

  it("verifies an email with a valid one-time token", async () => {
    const token = "b".repeat(64);
    prisma.emailVerificationToken.findUnique.mockResolvedValue({
      id: "verify-1",
      userId: user.id,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.emailVerificationToken.deleteMany.mockResolvedValue({ count: 1 });
    prisma.user.update.mockResolvedValue({
      ...user,
      emailVerifiedAt: new Date(),
    });
    prisma.auditLog.create.mockResolvedValue({});

    await expect(service.verifyEmail(token)).resolves.toEqual({
      message: expect.stringContaining("email is verified"),
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: { emailVerifiedAt: expect.any(Date) },
    });
    expect(prisma.emailVerificationToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: user.id },
    });
  });

  it("creates a fresh hashed verification link when the signed-in user resends it", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      emailVerifiedAt: null,
      emailVerificationTokens: [],
    });
    prisma.emailVerificationToken.deleteMany.mockResolvedValue({ count: 1 });
    prisma.emailVerificationToken.create.mockResolvedValue({});
    prisma.auditLog.create.mockResolvedValue({});
    config.get.mockImplementation((key: string) =>
      key === "FRONTEND_URL" ? "http://localhost:3000" : undefined,
    );

    const result = await service.resendEmailVerification(user.id);

    expect(result.verificationUrl).toContain("/verify-email?token=");
    const storedHash = prisma.emailVerificationToken.create.mock.calls[0][0]
      .data.tokenHash as string;
    const rawToken = new URL(result.verificationUrl as string).searchParams.get(
      "token",
    );
    expect(storedHash).toHaveLength(64);
    expect(storedHash).not.toBe(rawToken);
    expect(emailOutbox.enqueue).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({ tokenHash: storedHash }),
    );
  });

  it("rejects invalid credentials", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.login({ email: user.email, password: "SecurePassword123" }),
    ).rejects.toThrow("Invalid email or password");
  });

  it("rejects a refresh token that another request already consumed", async () => {
    jwt.verifyAsync.mockResolvedValue({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    prisma.refreshToken.findMany.mockResolvedValue([
      { id: "refresh-1", tokenHash: await bcrypt.hash("refresh-token", 4) },
    ]);
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.refreshToken.deleteMany.mockResolvedValue({ count: 0 });

    await expect(service.refresh("refresh-token")).rejects.toThrow(
      "Refresh token has already been used",
    );
    expect(prisma.refreshToken.delete).not.toHaveBeenCalled();
  });

  it("creates a hashed, short-lived recovery token without exposing account existence", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      passwordResetTokens: [],
    });
    prisma.passwordResetToken.create.mockResolvedValue({});
    prisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
    prisma.auditLog.create.mockResolvedValue({});
    config.get.mockImplementation((key: string) =>
      key === "FRONTEND_URL" ? "http://localhost:3000" : undefined,
    );

    const result = await service.requestPasswordReset(user.email);

    expect(result.message).toContain("If an account matches");
    expect(result.resetUrl).toContain("/reset-password?token=");
    const storedHash = prisma.passwordResetToken.create.mock.calls[0][0].data
      .tokenHash as string;
    const rawToken = new URL(result.resetUrl as string).searchParams.get(
      "token",
    );
    expect(storedHash).toHaveLength(64);
    expect(storedHash).not.toBe(rawToken);
    expect(emailOutbox.enqueue).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({ tokenHash: storedHash }),
    );
  });

  it("stores the password reset email job without contacting SMTP", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      passwordResetTokens: [],
    });
    prisma.passwordResetToken.create.mockResolvedValue({});
    prisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
    prisma.auditLog.create.mockResolvedValue({});
    config.get.mockImplementation((key: string) =>
      key === "FRONTEND_URL" ? "http://localhost:3000" : undefined,
    );

    await expect(service.requestPasswordReset(user.email)).resolves.toEqual(
      expect.objectContaining({ message: expect.any(String) }),
    );
    expect(emailOutbox.enqueue).toHaveBeenCalledTimes(1);
  });

  it("does not create or email another reset token during the cooldown", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      passwordResetTokens: [{ createdAt: new Date() }],
    });

    await expect(service.requestPasswordReset(user.email)).resolves.toEqual({
      message: expect.stringContaining("If an account matches"),
    });
    expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
    expect(emailOutbox.enqueue).not.toHaveBeenCalled();
  });

  it("resets the password, consumes recovery tokens, and revokes active sessions", async () => {
    const token = "a".repeat(64);
    prisma.passwordResetToken.findUnique.mockResolvedValue({
      id: "reset-1",
      userId: user.id,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 1 });
    prisma.user.update.mockResolvedValue(user);
    prisma.refreshToken.deleteMany.mockResolvedValue({ count: 2 });
    prisma.auditLog.create.mockResolvedValue({});

    await expect(
      service.resetPassword(token, "NewSecurePassword123"),
    ).resolves.toEqual({
      message: expect.stringContaining("password has been reset"),
    });
    expect(prisma.user.update.mock.calls[0][0].data.passwordHash).not.toBe(
      "NewSecurePassword123",
    );
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: user.id },
    });
  });
});

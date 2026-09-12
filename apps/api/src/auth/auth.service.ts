import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import {
  AccountType,
  AuditAction,
  EmailJobType,
  User,
  UserRole,
} from "@prisma/client";
import * as bcrypt from "bcrypt";
import { createHash, randomBytes, randomInt, randomUUID } from "crypto";
import { EmailOutboxService } from "../email/email-outbox.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser } from "./auth-user.interface";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  sid: string;
}
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  emailVerificationRequired: boolean;
}
export interface SessionContext {
  userAgent?: string;
  ipAddress?: string;
}
export interface PasswordResetRequestResult {
  message: string;
  resetUrl?: string;
}
export interface EmailVerificationRequestResult {
  message: string;
  verificationUrl?: string;
}

const EMAIL_VERIFICATION_VALIDITY_MS = 24 * 60 * 60 * 1000;
const EMAIL_VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;
const PASSWORD_RESET_REQUEST_COOLDOWN_MS = 2 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly emailOutbox: EmailOutboxService,
  ) {}

  async register(
    dto: RegisterDto,
    sessionContext: SessionContext = {},
  ): Promise<AuthTokens> {
    const email = dto.email.toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } }))
      throw new ConflictException("Email address is already registered");
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const token = randomBytes(32).toString("hex");
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_VALIDITY_MS);
    const verificationUrl = this.createVerificationUrl(token);
    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          accounts: {
            create: {
              accountNumber: this.createAccountNumber(),
              type: AccountType.SAVINGS,
            },
          },
        },
      });
      await tx.emailVerificationToken.create({
        data: { userId: createdUser.id, tokenHash, expiresAt },
      });
      await this.emailOutbox.enqueue(tx, {
        kind: EmailJobType.EMAIL_VERIFICATION,
        email: createdUser.email,
        firstName: createdUser.firstName,
        verificationUrl,
        tokenHash,
      });
      await tx.auditLog.createMany({
        data: [
          {
            userId: createdUser.id,
            action: "REGISTRATION_SUCCEEDED",
            entityType: "User",
            entityId: createdUser.id,
          },
          {
            userId: createdUser.id,
            action: "EMAIL_VERIFICATION_REQUESTED",
            entityType: "User",
            entityId: createdUser.id,
          },
        ],
      });
      return createdUser;
    });
    this.emailOutbox.scheduleProcessing();

    return this.issueTokens(user, sessionContext);
  }

  async login(
    dto: LoginDto,
    sessionContext: SessionContext = {},
  ): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      await this.prisma.auditLog.create({
        data: {
          action: "LOGIN_FAILED",
          entityType: "User",
          metadata: { email: dto.email.toLowerCase() },
        },
      });
      throw new UnauthorizedException("Invalid email or password");
    }
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "LOGIN_SUCCEEDED",
        entityType: "User",
        entityId: user.id,
      },
    });
    return this.issueTokens(user, sessionContext);
  }

  async refresh(
    refreshToken: string,
    sessionContext: SessionContext = {},
  ): Promise<AuthTokens> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const token = await this.findStoredToken(payload.sub, refreshToken);
    if (!token) throw new UnauthorizedException("Invalid refresh token");
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) throw new UnauthorizedException("Invalid refresh token");
    const consumed = await this.prisma.refreshToken.deleteMany({
      where: { id: token.id },
    });
    if (consumed.count !== 1)
      throw new UnauthorizedException("Refresh token has already been used");
    return this.issueTokens(user, sessionContext);
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    const token = await this.findStoredToken(userId, refreshToken);
    if (token)
      await this.prisma.refreshToken.deleteMany({ where: { id: token.id } });
  }

  async requestPasswordReset(
    email: string,
  ): Promise<PasswordResetRequestResult> {
    const message =
      "If an account matches that email, we have sent password reset instructions.";
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: {
        id: true,
        email: true,
        firstName: true,
        passwordResetTokens: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
    });
    if (!user) return { message };

    const latestToken = user.passwordResetTokens[0];
    if (
      latestToken &&
      latestToken.createdAt.getTime() + PASSWORD_RESET_REQUEST_COOLDOWN_MS >
        Date.now()
    ) {
      return { message };
    }

    const token = randomBytes(32).toString("hex");
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const frontendUrl = (
      this.config.get<string>("FRONTEND_URL") ?? "http://localhost:3000"
    ).replace(/\/$/, "");
    const resetUrl =
      frontendUrl + "/reset-password?token=" + encodeURIComponent(token);

    await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.deleteMany({ where: { userId: user.id } });
      await tx.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
      });
      await this.emailOutbox.enqueue(tx, {
        kind: EmailJobType.PASSWORD_RESET,
        email: user.email,
        firstName: user.firstName,
        resetUrl,
        tokenHash,
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "PASSWORD_RESET_REQUESTED",
          entityType: "User",
          entityId: user.id,
        },
      });
    });
    this.emailOutbox.scheduleProcessing();

    return process.env.NODE_ENV !== "production"
      ? { message, resetUrl }
      : { message };
  }

  async resetPassword(
    token: string,
    password: string,
  ): Promise<{ message: string }> {
    const tokenHash = this.hashToken(token);
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true },
    });
    if (!resetToken || resetToken.expiresAt <= new Date()) {
      if (resetToken)
        await this.prisma.passwordResetToken.deleteMany({
          where: { id: resetToken.id },
        });
      throw new BadRequestException(
        "This password reset link is invalid or has expired",
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.passwordResetToken.deleteMany({
        where: { id: resetToken.id, expiresAt: { gt: new Date() } },
      });
      if (consumed.count !== 1)
        throw new BadRequestException(
          "This password reset link is invalid or has expired",
        );
      await tx.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      });
      await tx.passwordResetToken.deleteMany({
        where: { userId: resetToken.userId },
      });
      await tx.refreshToken.deleteMany({
        where: { userId: resetToken.userId },
      });
      await tx.auditLog.create({
        data: {
          userId: resetToken.userId,
          action: "PASSWORD_RESET_COMPLETED",
          entityType: "User",
          entityId: resetToken.userId,
        },
      });
    });

    return {
      message:
        "Your password has been reset. You can now sign in with your new password.",
    };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const tokenHash = this.hashToken(token);
    const verificationToken =
      await this.prisma.emailVerificationToken.findUnique({
        where: { tokenHash },
        select: { id: true, userId: true, expiresAt: true },
      });
    if (!verificationToken || verificationToken.expiresAt <= new Date()) {
      if (verificationToken) {
        await this.prisma.emailVerificationToken.deleteMany({
          where: { id: verificationToken.id },
        });
      }
      throw new BadRequestException(
        "This email verification link is invalid or has expired",
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.emailVerificationToken.deleteMany({
        where: { id: verificationToken.id, expiresAt: { gt: new Date() } },
      });
      if (consumed.count !== 1) {
        throw new BadRequestException(
          "This email verification link is invalid or has expired",
        );
      }
      await tx.user.update({
        where: { id: verificationToken.userId },
        data: { emailVerifiedAt: new Date() },
      });
      await tx.emailVerificationToken.deleteMany({
        where: { userId: verificationToken.userId },
      });
      await tx.auditLog.create({
        data: {
          userId: verificationToken.userId,
          action: "EMAIL_VERIFIED",
          entityType: "User",
          entityId: verificationToken.userId,
        },
      });
    });

    return {
      message:
        "Your email is verified. All banking features are now available.",
    };
  }

  async resendEmailVerification(
    userId: string,
  ): Promise<EmailVerificationRequestResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        emailVerifiedAt: true,
        emailVerificationTokens: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
    });
    if (!user) throw new UnauthorizedException();
    if (user.emailVerifiedAt) {
      return { message: "Your email address is already verified." };
    }

    const latestToken = user.emailVerificationTokens[0];
    if (
      latestToken &&
      latestToken.createdAt.getTime() + EMAIL_VERIFICATION_RESEND_COOLDOWN_MS >
        Date.now()
    ) {
      return {
        message:
          "A verification email was sent recently. Please wait a minute before requesting another.",
      };
    }

    const token = randomBytes(32).toString("hex");
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_VALIDITY_MS);
    const verificationUrl = this.createVerificationUrl(token);
    await this.prisma.$transaction(async (tx) => {
      await tx.emailVerificationToken.deleteMany({ where: { userId } });
      await tx.emailVerificationToken.create({
        data: { userId, tokenHash, expiresAt },
      });
      await this.emailOutbox.enqueue(tx, {
        kind: EmailJobType.EMAIL_VERIFICATION,
        email: user.email,
        firstName: user.firstName,
        verificationUrl,
        tokenHash,
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: "EMAIL_VERIFICATION_REQUESTED",
          entityType: "User",
          entityId: userId,
        },
      });
    });
    this.emailOutbox.scheduleProcessing();

    const message = "We sent a new verification link to your email address.";
    return process.env.NODE_ENV !== "production"
      ? { message, verificationUrl }
      : { message };
  }

  async getCurrentUser(userId: string): Promise<
    AuthUser & {
      firstName: string;
      lastName: string;
      emailVerifiedAt: Date | null;
    }
  > {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        emailVerifiedAt: true,
      },
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new BadRequestException("Current password is incorrect");
    }
    if (await bcrypt.compare(newPassword, user.passwordHash)) {
      throw new BadRequestException(
        "New password must be different from your current password",
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash },
      });
      await tx.refreshToken.deleteMany({ where: { userId } });
      await tx.auditLog.create({
        data: {
          userId,
          action: AuditAction.PASSWORD_CHANGED,
          entityType: "User",
          entityId: userId,
        },
      });
      await tx.notification.create({
        data: {
          userId,
          type: "SECURITY_ALERT",
          title: "Password changed",
          message:
            "Your password was changed and all active sessions were signed out.",
        },
      });
    });
    return {
      message: "Password changed. Sign in again with your new password.",
    };
  }

  async listSessions(userId: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { userId, expiresAt: { lte: new Date() } },
    });
    return this.prisma.refreshToken.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true,
      },
    });
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const revoked = await tx.refreshToken.deleteMany({
        where: { id: sessionId, userId },
      });
      if (revoked.count !== 1) {
        throw new NotFoundException("Active session not found");
      }
      await tx.auditLog.create({
        data: {
          userId,
          action: AuditAction.SESSION_REVOKED,
          entityType: "RefreshToken",
          entityId: sessionId,
        },
      });
    });
  }

  private async issueTokens(
    user: User,
    sessionContext: SessionContext,
  ): Promise<AuthTokens> {
    const sessionId = randomUUID();
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      sid: sessionId,
    };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
      expiresIn: 900,
    });
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
      expiresIn: 604800,
    });
    await this.prisma.refreshToken.create({
      data: {
        id: sessionId,
        userId: user.id,
        tokenHash: await bcrypt.hash(refreshToken, 12),
        expiresAt: new Date(Date.now() + 604800000),
        userAgent: sessionContext.userAgent,
        ipAddress: sessionContext.ipAddress,
      },
    });
    return {
      accessToken,
      refreshToken,
      sessionId,
      emailVerificationRequired: user.emailVerifiedAt === null,
    };
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private createVerificationUrl(token: string): string {
    const frontendUrl = (
      this.config.get<string>("FRONTEND_URL") ?? "http://localhost:3000"
    ).replace(/\/$/, "");
    return frontendUrl + "/verify-email?token=" + encodeURIComponent(token);
  }

  private async verifyRefreshToken(token: string): Promise<TokenPayload> {
    try {
      return await this.jwtService.verifyAsync<TokenPayload>(token, {
        secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
      });
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  private async findStoredToken(userId: string, rawToken: string) {
    const tokens = await this.prisma.refreshToken.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
    });
    for (const token of tokens)
      if (await bcrypt.compare(rawToken, token.tokenHash)) return token;
    return null;
  }

  private createAccountNumber(): string {
    return randomInt(1_000_000_000, 10_000_000_000).toString();
  }
}

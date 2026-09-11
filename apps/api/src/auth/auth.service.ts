import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { AccountType, User, UserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { createHash, randomBytes, randomInt } from "crypto";
import { createTransport } from "nodemailer";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser } from "./auth-user.interface";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
export interface PasswordResetRequestResult {
  message: string;
  resetUrl?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokens> {
    const email = dto.email.toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } }))
      throw new ConflictException("Email address is already registered");
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
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
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "REGISTRATION_SUCCEEDED",
        entityType: "User",
        entityId: user.id,
      },
    });
    return this.issueTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
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
    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
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
    return this.issueTokens(user);
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
      select: { id: true, email: true },
    });
    if (!user) return { message };

    const token = randomBytes(32).toString("hex");
    const tokenHash = this.hashResetToken(token);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.deleteMany({ where: { userId: user.id } });
      await tx.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
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

    const frontendUrl = (
      this.config.get<string>("FRONTEND_URL") ?? "http://localhost:3000"
    ).replace(/\/$/, "");
    const resetUrl =
      frontendUrl + "/reset-password?token=" + encodeURIComponent(token);
    const delivered = await this.sendPasswordResetEmail(user.email, resetUrl);

    return process.env.NODE_ENV !== "production" && !delivered
      ? { message, resetUrl }
      : { message };
  }

  async resetPassword(
    token: string,
    password: string,
  ): Promise<{ message: string }> {
    const tokenHash = this.hashResetToken(token);
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

  async getCurrentUser(
    userId: string,
  ): Promise<AuthUser & { firstName: string; lastName: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
      },
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }

  private async issueTokens(user: User): Promise<AuthTokens> {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
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
        userId: user.id,
        tokenHash: await bcrypt.hash(refreshToken, 12),
        expiresAt: new Date(Date.now() + 604800000),
      },
    });
    return { accessToken, refreshToken };
  }

  private hashResetToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private async sendPasswordResetEmail(
    email: string,
    resetUrl: string,
  ): Promise<boolean> {
    const host = this.config.get<string>("SMTP_HOST");
    const port = Number(this.config.get<string>("SMTP_PORT") ?? "587");
    const secure =
      this.config.get<string>("SMTP_SECURE") === "true" || port === 465;
    const user = this.config.get<string>("SMTP_USER");
    const password = this.config.get<string>("SMTP_PASSWORD");
    const from = this.config.get<string>("EMAIL_FROM");
    if (!host || !from) return false;
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      this.logger.warn(
        "Password reset email was not sent because SMTP_PORT is invalid.",
      );
      return false;
    }
    if ((user && !password) || (!user && password)) {
      this.logger.warn(
        "Password reset email was not sent because SMTP credentials are incomplete.",
      );
      return false;
    }

    try {
      const transport = createTransport({
        host,
        port,
        secure,
        auth: user && password ? { user, pass: password } : undefined,
        requireTLS: this.config.get<string>("SMTP_REQUIRE_TLS") === "true",
        connectionTimeout: 8_000,
        greetingTimeout: 8_000,
        socketTimeout: 10_000,
      });
      await transport.sendMail({
        from,
        to: email,
        subject: "Reset your Nuel Bank password",
        html:
          '<div style="font-family:Arial,sans-serif;color:#18352e;line-height:1.6"><h2>Reset your password</h2><p>We received a request to reset your Nuel Bank password.</p><p><a href="' +
          resetUrl +
          '" style="display:inline-block;background:#087a5b;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700">Reset password</a></p><p>This link expires in 15 minutes. If you did not request this, you can safely ignore this email.</p></div>',
        text:
          "Reset your Nuel Bank password using this link: " +
          resetUrl +
          ". The link expires in 15 minutes.",
      });
      transport.close();
      return true;
    } catch {
      this.logger.warn(
        "Password reset email could not be delivered through SMTP.",
      );
      return false;
    }
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

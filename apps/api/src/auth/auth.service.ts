import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AccountType, User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from './auth-user.interface';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

interface TokenPayload { sub: string; email: string; role: UserRole; }
export interface AuthTokens { accessToken: string; refreshToken: string; }

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwtService: JwtService, private readonly config: ConfigService) {}

  async register(dto: RegisterDto): Promise<AuthTokens> {
    const email = dto.email.toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) throw new ConflictException('Email address is already registered');
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({ data: { email, passwordHash, firstName: dto.firstName, lastName: dto.lastName, accounts: { create: { accountNumber: this.createAccountNumber(), type: AccountType.SAVINGS } } } });
    return this.issueTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) throw new UnauthorizedException('Invalid email or password');
    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const token = await this.findStoredToken(payload.sub, refreshToken);
    if (!token) throw new UnauthorizedException('Invalid refresh token');
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('Invalid refresh token');
    await this.prisma.refreshToken.delete({ where: { id: token.id } });
    return this.issueTokens(user);
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    const token = await this.findStoredToken(userId, refreshToken);
    if (token) await this.prisma.refreshToken.delete({ where: { id: token.id } });
  }

  async getCurrentUser(userId: string): Promise<AuthUser & { firstName: string; lastName: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, role: true, firstName: true, lastName: true } });
    if (!user) throw new UnauthorizedException();
    return user;
  }

  private async issueTokens(user: User): Promise<AuthTokens> {
    const payload: TokenPayload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload, { secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'), expiresIn: 900 });
    const refreshToken = await this.jwtService.signAsync(payload, { secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'), expiresIn: 604800 });
    await this.prisma.refreshToken.create({ data: { userId: user.id, tokenHash: await bcrypt.hash(refreshToken, 12), expiresAt: new Date(Date.now() + 604800000) } });
    return { accessToken, refreshToken };
  }

  private async verifyRefreshToken(token: string): Promise<TokenPayload> {
    try { return await this.jwtService.verifyAsync<TokenPayload>(token, { secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET') }); }
    catch { throw new UnauthorizedException('Invalid refresh token'); }
  }

  private async findStoredToken(userId: string, rawToken: string) {
    const tokens = await this.prisma.refreshToken.findMany({ where: { userId, expiresAt: { gt: new Date() } } });
    for (const token of tokens) if (await bcrypt.compare(rawToken, token.tokenHash)) return token;
    return null;
  }

  private createAccountNumber(): string {
    return randomInt(1_000_000_000, 10_000_000_000).toString();
  }
}

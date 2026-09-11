import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { UserRole } from "@prisma/client";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser } from "./auth-user.interface";

interface AccessTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  sid: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>("JWT_ACCESS_SECRET"),
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AuthUser> {
    if (!payload.sid)
      throw new UnauthorizedException("Session is no longer active");
    const session = await this.prisma.refreshToken.findFirst({
      where: {
        id: payload.sid,
        userId: payload.sub,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });
    if (!session)
      throw new UnauthorizedException("Session is no longer active");
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}

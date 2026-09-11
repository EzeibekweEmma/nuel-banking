import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser } from "./auth-user.interface";

@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    if (!request.user) throw new UnauthorizedException();

    const user = await this.prisma.user.findUnique({
      where: { id: request.user.id },
      select: { emailVerifiedAt: true },
    });
    if (!user) throw new UnauthorizedException();
    if (!user.emailVerifiedAt) {
      throw new ForbiddenException(
        "Verify your email address before using this banking feature.",
      );
    }
    return true;
  }
}

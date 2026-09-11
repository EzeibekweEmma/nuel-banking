import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditAction } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async updateProfile(
    userId: string,
    profile: { firstName: string; lastName: string },
  ) {
    const firstName = profile.firstName.trim();
    const lastName = profile.lastName.trim();
    if (firstName.length < 2 || lastName.length < 2) {
      throw new BadRequestException(
        "First and last name must each contain at least two characters",
      );
    }
    const exists = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException("User profile not found");

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: { firstName, lastName },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          emailVerifiedAt: true,
          createdAt: true,
        },
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: AuditAction.PROFILE_UPDATED,
          entityType: "User",
          entityId: userId,
          metadata: { fields: ["firstName", "lastName"] },
        },
      });
      return user;
    });
  }
}

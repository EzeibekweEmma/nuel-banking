import { applyDecorators, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

export function AdminOnly(): ClassDecorator & MethodDecorator {
  return applyDecorators(UseGuards(JwtAuthGuard, RolesGuard), Roles(UserRole.ADMIN));
}

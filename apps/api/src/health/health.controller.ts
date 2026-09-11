import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<{
    status: "healthy";
    database: "connected";
    timestamp: string;
  }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: "healthy",
        database: "connected",
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException({
        status: "unhealthy",
        database: "unavailable",
      });
    }
  }
}

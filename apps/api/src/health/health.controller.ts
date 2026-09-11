import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../prisma/prisma.service";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: "Check API and database health" })
  @ApiOkResponse({
    description: "The API and PostgreSQL connection are healthy.",
    schema: {
      example: {
        status: "healthy",
        database: "connected",
        timestamp: "2026-09-11T12:00:00.000Z",
      },
    },
  })
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

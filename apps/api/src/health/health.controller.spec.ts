import { ServiceUnavailableException } from "@nestjs/common";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  const prisma = { $queryRaw: jest.fn() };
  const controller = new HealthController(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it("reports a connected database", async () => {
    prisma.$queryRaw.mockResolvedValue([{ result: 1 }]);

    await expect(controller.check()).resolves.toEqual({
      status: "healthy",
      database: "connected",
      timestamp: expect.any(String),
    });
  });

  it("returns a service-unavailable error when the database is down", async () => {
    prisma.$queryRaw.mockRejectedValue(new Error("connection failed"));

    await expect(controller.check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});

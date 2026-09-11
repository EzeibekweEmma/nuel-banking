import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UserRole } from "@prisma/client";
import { JwtStrategy } from "./jwt.strategy";

describe("JwtStrategy", () => {
  const config = { getOrThrow: jest.fn().mockReturnValue("a".repeat(32)) };
  const prisma = { refreshToken: { findFirst: jest.fn() } };
  const strategy = new JwtStrategy(
    config as never as ConfigService,
    prisma as never,
  );
  const payload = {
    sub: "user-1",
    email: "user@example.com",
    role: UserRole.CUSTOMER,
    sid: "session-1",
  };

  beforeEach(() => jest.clearAllMocks());

  it("accepts an access token only while its session is active", async () => {
    prisma.refreshToken.findFirst.mockResolvedValue({ id: payload.sid });

    await expect(strategy.validate(payload)).resolves.toEqual({
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    });
  });

  it("rejects an access token after its session is revoked", async () => {
    prisma.refreshToken.findFirst.mockResolvedValue(null);

    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

import { ExecutionContext, HttpException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { RATE_LIMIT_METADATA, RateLimitOptions } from "./rate-limit.constants";
import { RateLimitGuard } from "./rate-limit.guard";

interface TestRequest {
  ip: string;
  socket: { remoteAddress: string };
  user?: { id: string; email: string; role: UserRole };
}

describe("RateLimitGuard", () => {
  const options: RateLimitOptions = {
    bucket: "test",
    limit: 2,
    windowMs: 60_000,
    identity: "ip",
  };

  function createHarness(
    request: TestRequest,
    limitOptions: RateLimitOptions = options,
  ) {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) =>
        key === RATE_LIMIT_METADATA ? limitOptions : undefined,
      ),
    };
    const response = { setHeader: jest.fn() };
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;
    return {
      guard: new RateLimitGuard(reflector as never),
      context,
      response,
    };
  }

  it("allows requests within the limit and exposes remaining capacity", () => {
    const { guard, context, response } = createHarness({
      ip: "203.0.113.1",
      socket: { remoteAddress: "203.0.113.1" },
    });

    expect(guard.canActivate(context)).toBe(true);
    expect(guard.canActivate(context)).toBe(true);
    expect(response.setHeader).toHaveBeenCalledWith("X-RateLimit-Remaining", 0);
  });

  it("rejects excess requests with 429 and a retry-after header", () => {
    const { guard, context, response } = createHarness({
      ip: "203.0.113.2",
      socket: { remoteAddress: "203.0.113.2" },
    });
    guard.canActivate(context);
    guard.canActivate(context);

    try {
      guard.canActivate(context);
      throw new Error("Expected rate limiting to reject the request");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(429);
    }
    expect(response.setHeader).toHaveBeenCalledWith(
      "Retry-After",
      expect.any(Number),
    );
  });

  it("keeps authenticated users in separate rate-limit buckets", () => {
    const userOptions = { ...options, limit: 1, identity: "user" as const };
    const firstRequest: TestRequest = {
      ip: "203.0.113.3",
      socket: { remoteAddress: "203.0.113.3" },
      user: {
        id: "user-1",
        email: "one@example.com",
        role: UserRole.CUSTOMER,
      },
    };
    const { guard, context } = createHarness(firstRequest, userOptions);

    expect(guard.canActivate(context)).toBe(true);
    firstRequest.user = {
      id: "user-2",
      email: "two@example.com",
      role: UserRole.CUSTOMER,
    };
    expect(guard.canActivate(context)).toBe(true);
  });
});

import { applyDecorators, SetMetadata, UseGuards } from "@nestjs/common";
import { RATE_LIMIT_METADATA, RateLimitOptions } from "./rate-limit.constants";
import { RateLimitGuard } from "./rate-limit.guard";

export function RateLimit(options: RateLimitOptions): MethodDecorator {
  return applyDecorators(
    SetMetadata(RATE_LIMIT_METADATA, options),
    UseGuards(RateLimitGuard),
  );
}

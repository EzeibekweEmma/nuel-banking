import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request, Response } from "express";
import { AuthUser } from "../auth/auth-user.interface";
import { RATE_LIMIT_METADATA, RateLimitOptions } from "./rate-limit.constants";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

type RateLimitRequest = Request & { user?: AuthUser };

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly entries = new Map<string, RateLimitEntry>();
  private lastCleanupAt = 0;

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(
      RATE_LIMIT_METADATA,
      [context.getHandler(), context.getClass()],
    );
    if (!options) return true;

    const http = context.switchToHttp();
    const request = http.getRequest<RateLimitRequest>();
    const response = http.getResponse<Response>();
    const now = Date.now();
    this.removeExpiredEntries(now);

    const key = `${options.bucket}:${this.getIdentity(request, options)}`;
    const existing = this.entries.get(key);
    const entry =
      existing && existing.resetAt > now
        ? existing
        : { count: 0, resetAt: now + options.windowMs };

    if (entry.count >= options.limit) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((entry.resetAt - now) / 1000),
      );
      response.setHeader("Retry-After", retryAfterSeconds);
      response.setHeader("X-RateLimit-Limit", options.limit);
      response.setHeader("X-RateLimit-Remaining", 0);
      response.setHeader("X-RateLimit-Reset", Math.ceil(entry.resetAt / 1000));
      throw new HttpException(
        `Too many requests. Try again in ${retryAfterSeconds} seconds.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    entry.count += 1;
    this.entries.set(key, entry);
    response.setHeader("X-RateLimit-Limit", options.limit);
    response.setHeader(
      "X-RateLimit-Remaining",
      Math.max(0, options.limit - entry.count),
    );
    response.setHeader("X-RateLimit-Reset", Math.ceil(entry.resetAt / 1000));
    return true;
  }

  private getIdentity(
    request: RateLimitRequest,
    options: RateLimitOptions,
  ): string {
    if (options.identity === "user" && request.user?.id) {
      return `user:${request.user.id}`;
    }
    return `ip:${request.ip || request.socket.remoteAddress || "unknown"}`;
  }

  private removeExpiredEntries(now: number): void {
    if (now - this.lastCleanupAt < 5 * 60 * 1000) return;
    for (const [key, entry] of this.entries) {
      if (entry.resetAt <= now) this.entries.delete(key);
    }
    this.lastCleanupAt = now;
  }
}

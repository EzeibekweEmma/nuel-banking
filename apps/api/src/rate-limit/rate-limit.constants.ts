export const RATE_LIMIT_METADATA = "rate-limit:options";

export type RateLimitIdentity = "ip" | "user";

export interface RateLimitOptions {
  bucket: string;
  limit: number;
  windowMs: number;
  identity: RateLimitIdentity;
}

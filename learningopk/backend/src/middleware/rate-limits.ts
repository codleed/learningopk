import { createRateLimitMiddleware } from "./rate-limit.js";

export const GLOBAL_RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const GLOBAL_RATE_LIMIT_MAX_REQUESTS = 120;

export const globalRateLimiter = createRateLimitMiddleware({
  windowMs: GLOBAL_RATE_LIMIT_WINDOW_MS,
  maxRequests: GLOBAL_RATE_LIMIT_MAX_REQUESTS,
  keyPrefix: "rl:global"
});

export const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const AUTH_RATE_LIMIT_MAX_REQUESTS = 10;

export const authRateLimiter = createRateLimitMiddleware({
  windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
  maxRequests: AUTH_RATE_LIMIT_MAX_REQUESTS,
  keyPrefix: "rl:auth"
});

export const SCHOOL_JOIN_RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const SCHOOL_JOIN_RATE_LIMIT_MAX_REQUESTS = 5;

export const schoolJoinRateLimiter = createRateLimitMiddleware({
  windowMs: SCHOOL_JOIN_RATE_LIMIT_WINDOW_MS,
  maxRequests: SCHOOL_JOIN_RATE_LIMIT_MAX_REQUESTS,
  keyPrefix: "rl:school-join"
});

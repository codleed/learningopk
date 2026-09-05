import { createClient } from "redis";

import { env } from "../lib/env.js";
import { errorResponse } from "../lib/response.js";

const redisClient = createClient({
  url: env.REDIS_URL,
});

redisClient.on("error", (error) => {
  console.error("Rate limit Redis client error:", error);
});

let redisConnectionPromise: Promise<void> | null = null;

async function ensureRateLimitRedisConnection(): Promise<void> {
  if (redisClient.isOpen) {
    return;
  }

  if (!redisConnectionPromise) {
    redisConnectionPromise = redisClient.connect().then(() => {
      redisConnectionPromise = null;
    });
  }

  await redisConnectionPromise;
}

export { ensureRateLimitRedisConnection, redisClient };

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}

export function createRateLimitMiddleware(config: RateLimitConfig) {
  const { windowMs, maxRequests, keyPrefix = "rl" } = config;

  return async (
    req: import("express").Request,
    res: import("express").Response,
    next: import("express").NextFunction
  ) => {
    try {
      await ensureRateLimitRedisConnection();
    } catch (error) {
      console.error("Failed to connect to Redis for rate limiting:", error);
      next();
      return;
    }

    const identifier = req.ip ?? "unknown";
    const key = `${keyPrefix}:${identifier}`;

    try {
      const current = await redisClient.incr(key);

      if (current === 1) {
        await redisClient.expire(key, Math.ceil(windowMs / 1000));
      }

      const ttl = await redisClient.ttl(key);
      const resetSeconds = ttl > 0 ? ttl : Math.ceil(windowMs / 1000);

      res.setHeader("x-ratelimit-limit", String(maxRequests));
      res.setHeader("x-ratelimit-remaining", String(Math.max(0, maxRequests - current)));
      res.setHeader("x-ratelimit-reset", String(resetSeconds));

      if (current > maxRequests) {
        res.status(429).json(
          errorResponse("Too many requests. Please try again later.", "RATE_LIMIT_EXCEEDED", {
            retryAfterSeconds: resetSeconds,
          })
        );
        return;
      }

      next();
    } catch (error) {
      console.error("Rate limiting error:", error);
      next();
    }
  };
}

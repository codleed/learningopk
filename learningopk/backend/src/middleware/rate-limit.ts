import { createClient } from "redis";

import { env } from "../lib/env.js";
import { raceWithTimeout } from "../lib/timeout.js";
import { errorResponse } from "../lib/response.js";

// Upper bound for the initial Redis connection attempt. The client retries
// forever on its own; without this bound every request through a limiter
// would wait on a connection that may never settle.
const RATE_LIMIT_CONNECT_TIMEOUT_MS = 2_000;
// Upper bound for individual rate-limit commands — a client that is open but
// not ready queues commands indefinitely instead of rejecting them.
const RATE_LIMIT_COMMAND_TIMEOUT_MS = 1_000;

const redisClient = createClient({
  url: env.REDIS_URL
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
      const attempt = await raceWithTimeout(ensureRateLimitRedisConnection(), RATE_LIMIT_CONNECT_TIMEOUT_MS);
      if (!attempt.ok) {
        throw new Error(`Redis connection timed out after ${RATE_LIMIT_CONNECT_TIMEOUT_MS}ms`);
      }
      // A client that is open but still connecting resolves connect() as a
      // no-op; commands issued now would sit in the offline queue forever.
      if (!redisClient.isReady) {
        throw new Error("Redis client is not ready");
      }
    } catch (error) {
      console.error("Failed to connect to Redis for rate limiting:", error);
      next();
      return;
    }

    const identifier = req.ip ?? "unknown";
    const key = `${keyPrefix}:${identifier}`;

    try {
      const incrAttempt = await raceWithTimeout(redisClient.incr(key), RATE_LIMIT_COMMAND_TIMEOUT_MS);

      if (incrAttempt.ok && incrAttempt.value === 1) {
        await raceWithTimeout(redisClient.expire(key, Math.ceil(windowMs / 1000)), RATE_LIMIT_COMMAND_TIMEOUT_MS);
      }

      const ttlAttempt = await raceWithTimeout(redisClient.ttl(key), RATE_LIMIT_COMMAND_TIMEOUT_MS);
      const current = incrAttempt.ok ? incrAttempt.value : 1;
      const ttl = ttlAttempt.ok ? ttlAttempt.value : 0;
      const resetSeconds = ttl > 0 ? ttl : Math.ceil(windowMs / 1000);

      res.setHeader("x-ratelimit-limit", String(maxRequests));
      res.setHeader("x-ratelimit-remaining", String(Math.max(0, maxRequests - current)));
      res.setHeader("x-ratelimit-reset", String(resetSeconds));

      if (current > maxRequests) {
        res.status(429).json(
          errorResponse("Too many requests. Please try again later.", "RATE_LIMIT_EXCEEDED", {
            retryAfterSeconds: resetSeconds
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

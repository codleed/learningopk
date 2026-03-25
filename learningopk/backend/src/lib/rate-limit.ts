import { RequestHandler } from "express";
import { redis } from "./redis.js";

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}

export class RateLimiter {
  private windowMs: number;
  private maxRequests: number;
  private keyPrefix: string;

  constructor(config: RateLimitConfig) {
    this.windowMs = config.windowMs;
    this.maxRequests = config.maxRequests;
    this.keyPrefix = config.keyPrefix ?? "rl";
  }

  private buildKey(userId: string, action: string): string {
    return `${this.keyPrefix}:${action}:${userId}`;
  }

  async isAllowed(userId: string, action: string): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const key = this.buildKey(userId, action);
    const now = Date.now();
    const windowStart = now - this.windowMs;

    try {
      const currentCount = await redis.get(key);
      
      if (!currentCount) {
        await redis.setEx(key, Math.ceil(this.windowMs / 1000), "1");
        return {
          allowed: true,
          remaining: this.maxRequests - 1,
          resetAt: now + this.windowMs
        };
      }

      const count = parseInt(currentCount, 10);

      if (count >= this.maxRequests) {
        const ttl = await redis.ttl(key);
        return {
          allowed: false,
          remaining: 0,
          resetAt: now + (ttl > 0 ? ttl * 1000 : this.windowMs)
        };
      }

      await redis.incr(key);
      
      return {
        allowed: true,
        remaining: this.maxRequests - count - 1,
        resetAt: now + this.windowMs
      };
    } catch {
      return {
        allowed: true,
        remaining: this.maxRequests,
        resetAt: now + this.windowMs
      };
    }
  }

  middleware(action: string): RequestHandler {
    return async (req, res, next) => {
      const userId = (req as any).session?.user?.id;
      
      if (!userId) {
        next();
        return;
      }

      const result = await this.isAllowed(userId, action);

      res.setHeader("X-RateLimit-Limit", this.maxRequests.toString());
      res.setHeader("X-RateLimit-Remaining", result.remaining.toString());
      res.setHeader("X-RateLimit-Reset", Math.ceil(result.resetAt / 1000).toString());

      if (!result.allowed) {
        res.status(429).json({
          error: "Too many requests",
          code: "RATE_LIMIT_EXCEEDED",
          retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000)
        });
        return;
      }

      next();
    };
  }
}

export const searchRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  keyPrefix: "rl_search"
});

export const friendRequestRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 20,
  keyPrefix: "rl_friend"
});

export const messageRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 60,
  keyPrefix: "rl_message"
});

export const messageBurstRateLimiter = new RateLimiter({
  windowMs: 10 * 1000,
  maxRequests: 10,
  keyPrefix: "rl_msg_burst"
});

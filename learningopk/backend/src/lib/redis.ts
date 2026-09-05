import { createClient } from "redis";

import { env } from "./env.js";
import { logger } from "./logger.js";

export const redis = createClient({
  url: env.REDIS_URL,
});

redis.on("error", (error) => {
  logger.error({ error }, "Redis client error");
});

let connectionPromise: Promise<unknown> | null = null;

export const ensureRedisConnection = async (): Promise<void> => {
  if (redis.isOpen) {
    return;
  }

  if (!connectionPromise) {
    connectionPromise = redis.connect().finally(() => {
      connectionPromise = null;
    });
  }

  await connectionPromise;
};

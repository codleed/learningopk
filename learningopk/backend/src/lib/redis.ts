import { createClient } from "redis";

import { env } from "./env.js";

export const redis = createClient({
  url: env.REDIS_URL
});

redis.on("error", (error) => {
  console.error("Redis client error:", error);
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

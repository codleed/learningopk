import { Queue, Worker, QueueEvents } from "bullmq";
import { Redis } from "ioredis";

import { env } from "./env.js";

const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const connection = redisConnection;

export const analyticsQueue = new Queue("analytics", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});

export const emailQueue = new Queue("email", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "fixed", delay: 5000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});

export const cleanupQueue = new Queue("cleanup", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});

export const analyticsEvents = new QueueEvents("analytics", { connection: redisConnection });

export interface JobDefinition {
  name: string;
  queue: Queue;
  cron?: string;
  concurrency?: number;
  retryAttempts?: number;
  backoff?: { type: "exponential" | "fixed"; delay: number };
}

export const jobRegistry: JobDefinition[] = [
  {
    name: "daily-analytics",
    queue: analyticsQueue,
    cron: "0 0 * * *",
    concurrency: 2,
    retryAttempts: 3,
    backoff: { type: "exponential", delay: 1000 },
  },
  {
    name: "weekly-email",
    queue: emailQueue,
    cron: "0 9 * * 0",
    concurrency: 1,
    retryAttempts: 3,
    backoff: { type: "fixed", delay: 5000 },
  },
  {
    name: "stale-session-cleanup",
    queue: cleanupQueue,
    cron: "0 */6 * * *",
    concurrency: 1,
    retryAttempts: 2,
  },
];

export const allQueues = [analyticsQueue, emailQueue, cleanupQueue];

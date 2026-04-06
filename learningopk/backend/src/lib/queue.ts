import { Queue, QueueEvents } from "bullmq";
import { Redis } from "ioredis";

import { env } from "./env.js";

// ---------------------------------------------------------------------------
// Lazy singleton Redis connection
// ---------------------------------------------------------------------------

let _redisConnection: Redis | null = null;

export function getRedisConnection(): Redis {
  if (!_redisConnection) {
    _redisConnection = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
    });
  }
  return _redisConnection;
}

// ---------------------------------------------------------------------------
// Lazy singleton queues
// ---------------------------------------------------------------------------

let _analyticsQueue: Queue | null = null;
let _emailQueue: Queue | null = null;
let _cleanupQueue: Queue | null = null;
let _analyticsEvents: QueueEvents | null = null;

export function getAnalyticsQueue(): Queue {
  if (!_analyticsQueue) {
    _analyticsQueue = new Queue("analytics", {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    });
  }
  return _analyticsQueue;
}

export function getEmailQueue(): Queue {
  if (!_emailQueue) {
    _emailQueue = new Queue("email", {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "fixed", delay: 5000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    });
  }
  return _emailQueue;
}

export function getCleanupQueue(): Queue {
  if (!_cleanupQueue) {
    _cleanupQueue = new Queue("cleanup", {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    });
  }
  return _cleanupQueue;
}

export function getAnalyticsEvents(): QueueEvents {
  if (!_analyticsEvents) {
    _analyticsEvents = new QueueEvents("analytics", {
      connection: getRedisConnection(),
    });
  }
  return _analyticsEvents;
}

// ---------------------------------------------------------------------------
// Job registry (pure data, no side effects until queues are accessed)
// ---------------------------------------------------------------------------

export interface JobDefinition {
  name: string;
  queueName: string;
  getQueue: () => Queue;
  cron?: string;
  concurrency?: number;
  retryAttempts?: number;
  backoff?: { type: "exponential" | "fixed"; delay: number };
}

export const jobRegistry: JobDefinition[] = [
  {
    name: "daily-analytics",
    queueName: "analytics",
    getQueue: getAnalyticsQueue,
    cron: "0 0 * * *",
    concurrency: 2,
    retryAttempts: 3,
    backoff: { type: "exponential", delay: 1000 },
  },
  {
    name: "weekly-email",
    queueName: "email",
    getQueue: getEmailQueue,
    cron: "0 9 * * 0",
    concurrency: 1,
    retryAttempts: 3,
    backoff: { type: "fixed", delay: 5000 },
  },
  {
    name: "stale-session-cleanup",
    queueName: "cleanup",
    getQueue: getCleanupQueue,
    cron: "0 */6 * * *",
    concurrency: 1,
    retryAttempts: 2,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getAllQueues(): Queue[] {
  return [getAnalyticsQueue(), getEmailQueue(), getCleanupQueue()];
}

export async function closeAllQueues(): Promise<void> {
  const closing: Promise<void>[] = [];

  if (_analyticsEvents) {
    closing.push(_analyticsEvents.close());
    _analyticsEvents = null;
  }
  if (_analyticsQueue) {
    closing.push(_analyticsQueue.close());
    _analyticsQueue = null;
  }
  if (_emailQueue) {
    closing.push(_emailQueue.close());
    _emailQueue = null;
  }
  if (_cleanupQueue) {
    closing.push(_cleanupQueue.close());
    _cleanupQueue = null;
  }
  if (_redisConnection) {
    closing.push(_redisConnection.quit().then(() => undefined));
    _redisConnection = null;
  }

  await Promise.all(closing);
}

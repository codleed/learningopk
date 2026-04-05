import { Worker } from "bullmq";

import { getRedisConnection } from "../lib/queue.js";
import { logger } from "../lib/logger.js";
import { processDailyAnalytics, processWeeklyReport } from "../jobs/analytics.js";

export function createAnalyticsWorker() {
  const worker = new Worker(
    "analytics",
    async (job) => {
      if (job.name === "daily-analytics") {
        return processDailyAnalytics(job);
      }
      if (job.name === "weekly-email") {
        return processWeeklyReport(job);
      }
      throw new Error(`Unknown job name: ${job.name}`);
    },
    {
      connection: getRedisConnection(),
      concurrency: 2,
    }
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id, worker: "analytics" }, "Analytics job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, error: err, worker: "analytics" }, "Analytics job failed");
  });

  return worker;
}

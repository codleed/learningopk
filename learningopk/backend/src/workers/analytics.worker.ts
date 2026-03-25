import { Worker } from "bullmq";

import { connection, analyticsQueue } from "../lib/queue.js";
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
      connection,
      concurrency: 2,
    }
  );

  worker.on("completed", (job) => {
    console.log(`Analytics job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Analytics job ${job?.id} failed:`, err);
  });

  return worker;
}

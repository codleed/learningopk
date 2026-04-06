import { Worker } from "bullmq";

import { getRedisConnection } from "../lib/queue.js";
import { logger } from "../lib/logger.js";
import { processStaleSessionCleanup } from "../jobs/cleanup.js";

export function createCleanupWorker() {
  const worker = new Worker(
    "cleanup",
    async (job) => {
      return processStaleSessionCleanup(job);
    },
    {
      connection: getRedisConnection(),
      concurrency: 1,
    }
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id, worker: "cleanup" }, "Cleanup job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, error: err, worker: "cleanup" }, "Cleanup job failed");
  });

  return worker;
}

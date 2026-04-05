import { Worker } from "bullmq";

import { getRedisConnection } from "../lib/queue.js";
import { logger } from "../lib/logger.js";
import { processEmailJob } from "../jobs/email.js";

export function createEmailWorker() {
  const worker = new Worker(
    "email",
    async (job) => {
      return processEmailJob(job);
    },
    {
      connection: getRedisConnection(),
      concurrency: 1,
    }
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id, worker: "email" }, "Email job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, error: err, worker: "email" }, "Email job failed");
  });

  return worker;
}

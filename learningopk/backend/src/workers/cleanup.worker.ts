import { Worker } from "bullmq";

import { connection, cleanupQueue } from "../lib/queue.js";
import { processStaleSessionCleanup } from "../jobs/cleanup.js";

export function createCleanupWorker() {
  const worker = new Worker(
    "cleanup",
    async (job) => {
      return processStaleSessionCleanup(job);
    },
    {
      connection,
      concurrency: 1,
    }
  );

  worker.on("completed", (job) => {
    console.log(`Cleanup job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Cleanup job ${job?.id} failed:`, err);
  });

  return worker;
}

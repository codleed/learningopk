import { Worker } from "bullmq";

import { connection, emailQueue } from "../lib/queue.js";
import { processEmailJob } from "../jobs/email.js";

export function createEmailWorker() {
  const worker = new Worker(
    "email",
    async (job) => {
      return processEmailJob(job);
    },
    {
      connection,
      concurrency: 1,
    }
  );

  worker.on("completed", (job) => {
    console.log(`Email job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Email job ${job?.id} failed:`, err);
  });

  return worker;
}

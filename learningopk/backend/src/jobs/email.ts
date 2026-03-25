import type { EmailJob, EmailJobData } from "./types.js";

export async function processEmailJob(job: EmailJob): Promise<void> {
  const data = job.data as EmailJobData;
  console.log(`Processing email job: ${data.type} for ${data.email}`);

  await job.updateProgress(10);

  await job.updateProgress(100);
}

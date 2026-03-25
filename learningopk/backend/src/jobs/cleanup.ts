import type { CleanupJob, StaleSessionCleanupJobData } from "./types.js";
import { redis } from "../lib/redis.js";

export async function processStaleSessionCleanup(job: CleanupJob): Promise<void> {
  const data = job.data as StaleSessionCleanupJobData;
  console.log(`Processing stale session cleanup for sessions older than ${data.olderThan}`);

  await job.updateProgress(10);

  const keys = await redis.keys("session:*");
  let cleanedCount = 0;

  for (const key of keys) {
    const ttl = await redis.ttl(key);
    if (ttl === -1) {
      await redis.del(key);
      cleanedCount++;
    }
  }

  await job.updateProgress(100);
  console.log(`Cleaned up ${cleanedCount} stale sessions`);
}

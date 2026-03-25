import type { AnalyticsJob, WeeklyReportJobData, DailyAnalyticsJobData } from "./types.js";

export async function processDailyAnalytics(job: AnalyticsJob): Promise<void> {
  const data = job.data as DailyAnalyticsJobData;
  console.log(`Processing daily analytics for ${data.date}`);

  await job.updateProgress(10);

  await job.updateProgress(100);
}

export async function processWeeklyReport(job: AnalyticsJob): Promise<void> {
  const data = job.data as WeeklyReportJobData;
  console.log(`Processing weekly report for ${data.weekStart} to ${data.weekEnd}`);

  await job.updateProgress(10);

  await job.updateProgress(100);
}

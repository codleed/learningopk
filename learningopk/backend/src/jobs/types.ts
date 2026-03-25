import type { Job } from "bullmq";

export interface DailyAnalyticsJobData {
  date: string;
}

export interface WeeklyReportJobData {
  weekStart: string;
  weekEnd: string;
}

export interface StaleSessionCleanupJobData {
  olderThan: string;
}

export interface EmailJobData {
  type: "weekly-digest" | "notification" | "password-reset";
  recipientId: string;
  email: string;
  data: Record<string, unknown>;
}

export type AnalyticsJob = Job<DailyAnalyticsJobData | WeeklyReportJobData>;
export type CleanupJob = Job<StaleSessionCleanupJobData>;
export type EmailJob = Job<EmailJobData>;

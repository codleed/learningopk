"use client";

import { useState } from "react";

import { SectionCard } from "@/components/foundation/section-card";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { getAdminAnalyticsOverview, type AdminAnalyticsOverview } from "@/lib/admin-api";

import { AdminAnalyticsSubjectTable } from "./admin-analytics-subject-table";

type WindowDays = 7 | 30 | 90;

type AdminAnalyticsPanelProps = {
  initialPayload: AdminAnalyticsOverview;
};

export function AdminAnalyticsPanel({ initialPayload }: AdminAnalyticsPanelProps) {
  const [windowDays, setWindowDays] = useState<WindowDays>(initialPayload.windowDays);
  const [summary, setSummary] = useState(initialPayload.summary);
  const [subjectRows, setSubjectRows] = useState(initialPayload.subjectPerformance);
  const [confusionRows, setConfusionRows] = useState(initialPayload.confusionByChapter);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { pushToast } = useToast();

  const refreshWindow = async (nextWindowDays: WindowDays) => {
    setIsRefreshing(true);
    try {
      const payload = await getAdminAnalyticsOverview({
        windowDays: nextWindowDays
      });

      setWindowDays(payload.windowDays);
      setSummary(payload.summary);
      setSubjectRows(payload.subjectPerformance);
      setConfusionRows(payload.confusionByChapter);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to refresh analytics.";
      pushToast({
        tone: "error",
        title: "Analytics unavailable",
        description: message
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <SectionCard title="Performance Overview" description={`Last ${windowDays} days`}>
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[220px_1fr] md:items-end">
          <div className="space-y-1.5">
            <label htmlFor="analytics-window" className="text-xs font-semibold uppercase tracking-wide text-foreground">
              Time window
            </label>
            <Select
              id="analytics-window"
              value={String(windowDays)}
              disabled={isRefreshing}
              onChange={(event) => {
                void refreshWindow(Number(event.target.value) as WindowDays);
              }}
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </Select>
          </div>
          <p className="text-sm text-muted-foreground">{`Last ${windowDays} days`}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Active students</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{summary.activeStudents}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quiz attempts</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{summary.quizAttempts}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Average score</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{summary.averageQuizScorePercent.toFixed(1)}%</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Threads created</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{summary.threadsCreated}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Open moderation flags</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{summary.openModerationFlags}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 sm:col-span-2 xl:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Confusion events</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{summary.confusionEvents}</p>
          </div>
        </div>

        <AdminAnalyticsSubjectTable rows={subjectRows} />

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-foreground">Confusion patterns by chapter</h3>
            <p className="text-sm text-muted-foreground">Shows where proactive hints are firing most often.</p>
          </div>

          {confusionRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No confusion patterns recorded in this window.</p>
          ) : (
            <div className="space-y-2">
              {confusionRows.map((row) => (
                <div key={row.chapterId} className="flex items-center justify-between rounded-lg border border-border/80 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{row.chapterTitle}</p>
                    <p className="text-xs text-muted-foreground">{row.subjectName}</p>
                  </div>
                  <div className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{row.count}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
}

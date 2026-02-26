import type { DashboardSummaryResponse } from "@/lib/progress-api";

import { EmptyState } from "@/components/ui/states";

type RecentActivity = DashboardSummaryResponse["recentActivity"];

type RecentActivityFeedProps = {
  activity: RecentActivity;
};

export function RecentActivityFeed({ activity }: RecentActivityFeedProps) {
  if (activity.length === 0) {
    return <EmptyState title="No activity yet" description="Start a chapter to populate your timeline." />;
  }

  return (
    <ul className="space-y-3">
      {activity.map((entry, index) => (
        <li key={`${entry.type}-${entry.occurredAt}-${index}`} className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-sm font-medium text-foreground">
            {entry.type === "chapter_visit"
              ? `Visited ${entry.subjectName}: ${entry.chapterTitle}`
              : `Quiz submitted in ${entry.subjectName}: ${entry.chapterTitle} (${entry.percentage}%)`}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{new Date(entry.occurredAt).toLocaleString()}</p>
        </li>
      ))}
    </ul>
  );
}


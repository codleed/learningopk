import { BookOpen, FileText, Clock } from "lucide-react";

import { Card, CardHeader, CardBody } from "@/components/ui/card";
import type { DashboardSummaryResponse } from "@/lib/progress-api";
import { cn } from "@/lib/utils";

type RecentActivity = DashboardSummaryResponse["recentActivity"];

type RecentActivityFeedProps = {
  activity: RecentActivity;
};

const formatTimestamp = (isoDate: string): string =>
  new Date(isoDate).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const toLabel = (
  entry: DashboardSummaryResponse["recentActivity"][number]
): string => {
  if (entry.type === "chapter_visit") {
    return `Visited ${entry.subjectName}: ${entry.chapterTitle}`;
  }
  return `Quiz in ${entry.subjectName}: ${entry.chapterTitle} (${entry.percentage}%)`;
};

export function RecentActivityFeed({ activity }: RecentActivityFeedProps) {
  return (
    <Card variant="default" className="h-full flex flex-col">
      <CardHeader>
        <h2 className="font-[var(--font-display)] text-base font-bold text-text-primary">
          Recent Activity
        </h2>
      </CardHeader>
      <CardBody className="flex-1 pt-0">
        {activity.length > 0 ? (
          <ul className="space-y-2">
            {activity.slice(0, 5).map((entry, index) => (
              <li
                key={`${entry.type}-${entry.occurredAt}-${index}`}
                className="rounded-lg border border-border-default bg-bg-base px-3 py-2.5 transition-colors hover:border-border-strong"
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={cn(
                      "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                      entry.type === "chapter_visit"
                        ? "bg-accent-primary/10 text-accent-primary"
                        : "bg-accent-success/10 text-accent-success"
                    )}
                  >
                    {entry.type === "chapter_visit" ? (
                      <BookOpen className="h-3.5 w-3.5" aria-hidden />
                    ) : (
                      <FileText className="h-3.5 w-3.5" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-text-primary leading-snug">
                      {toLabel(entry)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-text-muted">
                      {formatTimestamp(entry.occurredAt)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center py-8">
            <Clock className="h-8 w-8 text-text-muted" aria-hidden />
            <p className="mt-2 text-sm text-text-secondary">
              No recent activity. Start a chapter to populate your timeline.
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

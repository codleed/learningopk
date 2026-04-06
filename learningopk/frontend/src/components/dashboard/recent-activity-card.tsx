import { BookOpen, Clock, FileText } from "lucide-react";

import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DashboardSummaryResponse } from "@/lib/progress-api";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type RecentActivity = DashboardSummaryResponse["recentActivity"];

export interface RecentActivityCardProps {
  activity: RecentActivity;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const formatActivityTimestamp = (isoDate: string): string =>
  new Date(isoDate).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const toActivityLabel = (
  entry: DashboardSummaryResponse["recentActivity"][number]
): string => {
  if (entry.type === "chapter_visit") {
    return `Visited ${entry.subjectName}: ${entry.chapterTitle}`;
  }
  return `Quiz in ${entry.subjectName}: ${entry.chapterTitle} (${entry.percentage}%)`;
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function RecentActivityCard({
  activity,
}: RecentActivityCardProps) {
  return (
    <Card variant="default" className="h-full flex flex-col">
      <CardHeader>
        <h3 className="font-[var(--font-display)] text-base font-bold text-text-primary">
          Recent Activity
        </h3>
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
                      {toActivityLabel(entry)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-text-muted">
                      {formatActivityTimestamp(entry.occurredAt)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center py-8">
            <Clock
              className="h-8 w-8 text-text-muted"
              aria-hidden
            />
            <p className="mt-2 text-xs text-text-secondary">
              No recent activity. Start a chapter!
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

import { BookOpen, Clock, FileText, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DashboardSummaryResponse } from "@/lib/progress-api";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type RecentActivity = DashboardSummaryResponse["recentActivity"];
type ActivityEntry = RecentActivity[number];

export interface RecentActivityCardProps {
  activity: RecentActivity;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MAX_ENTRIES = 6;

const SCORE_THRESHOLDS = {
  success: 70,
  warning: 40,
} as const;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const formatActivityTimestamp = (isoDate: string): string => {
  const date = new Date(isoDate);
  const now = new Date();

  const isSameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isSameDay) {
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60_000);

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours}h ago`;
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const toActivityLabel = (entry: ActivityEntry): string => {
  if (entry.type === "chapter_visit") {
    return `Visited ${entry.subjectName}: ${entry.chapterTitle}`;
  }
  return `Quiz in ${entry.subjectName}: ${entry.chapterTitle}`;
};

type ScoreBadgeVariant = "success" | "warning" | "danger";

const getScoreBadgeVariant = (percentage: number): ScoreBadgeVariant => {
  if (percentage >= SCORE_THRESHOLDS.success) return "success";
  if (percentage >= SCORE_THRESHOLDS.warning) return "warning";
  return "danger";
};

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function ActivityIcon({ type }: { type: ActivityEntry["type"] }) {
  return (
    <div
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
        type === "chapter_visit"
          ? "bg-accent-primary/10 text-accent-primary"
          : "bg-accent-success/10 text-accent-success"
      )}
    >
      {type === "chapter_visit" ? (
        <BookOpen className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <FileText className="h-3.5 w-3.5" aria-hidden />
      )}
    </div>
  );
}

function QuizScoreBadge({ percentage }: { percentage: number }) {
  const variant = getScoreBadgeVariant(percentage);
  return (
    <Badge variant={variant} size="sm" className="shrink-0 tabular-nums">
      {percentage}%
    </Badge>
  );
}

function ActivityItem({ entry }: { entry: ActivityEntry }) {
  return (
    <li className="py-2.5 border-b border-border-default/40 last:border-0">
      <div className="flex items-start gap-2.5">
        <ActivityIcon type={entry.type} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium leading-snug text-text-primary">
              {toActivityLabel(entry)}
            </p>
            {entry.type === "quiz_submit" && <QuizScoreBadge percentage={entry.percentage} />}
          </div>
          <p className="mt-0.5 text-[10px] text-text-muted">
            {formatActivityTimestamp(entry.occurredAt)}
          </p>
        </div>
      </div>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-10">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-bg-subtle">
        <div className="relative">
          <Clock className="h-7 w-7 text-text-muted" aria-hidden />
          <Sparkles
            className="absolute -right-2 -top-2 h-3.5 w-3.5 text-accent-primary"
            aria-hidden
          />
        </div>
      </div>
      <p className="mt-3 text-sm font-medium text-text-secondary">No activity yet</p>
      <p className="mt-1 text-xs text-text-muted">
        Start a chapter and your progress will appear here
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function RecentActivityCard({ activity }: RecentActivityCardProps) {
  const entries = activity.slice(0, MAX_ENTRIES);

  return (
    <Card variant="default" className="h-full flex flex-col">
      <CardHeader>
        <h3 className="font-[var(--font-display)] text-base font-bold text-text-primary">
          Recent Activity
        </h3>
      </CardHeader>

      <CardBody className="flex-1 pt-0">
        {entries.length > 0 ? (
          <ul>
            {entries.map((entry, index) => (
              <ActivityItem key={`${entry.type}-${entry.occurredAt}-${index}`} entry={entry} />
            ))}
          </ul>
        ) : (
          <EmptyState />
        )}
      </CardBody>
    </Card>
  );
}

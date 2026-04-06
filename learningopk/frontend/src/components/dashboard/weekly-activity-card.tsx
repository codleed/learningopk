"use client";

import { useCallback, useRef, useState } from "react";
import { Clock } from "lucide-react";

import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { DashboardSummaryResponse } from "@/lib/progress-api";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type WeeklyActivity = DashboardSummaryResponse["weeklyActivity"];

export interface WeeklyActivityCardProps {
  weeklyActivity: WeeklyActivity;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const getDayLabel = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });

const getFullDayLabel = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });

const getActivityIntensityClass = (count: number): string => {
  if (count === 0) return "bg-bg-subtle";
  if (count <= 1) return "bg-accent-primary/20";
  if (count <= 3) return "bg-accent-primary/40";
  if (count <= 5) return "bg-accent-primary/60";
  return "bg-accent-primary/80";
};

const getIntensityLabel = (count: number): string => {
  if (count === 0) return "no activity";
  if (count <= 1) return "light activity";
  if (count <= 3) return "moderate activity";
  if (count <= 5) return "high activity";
  return "very high activity";
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function WeeklyActivityCard({
  weeklyActivity,
}: WeeklyActivityCardProps) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const cellRefs = useRef<(HTMLDivElement | null)[]>([]);

  const totalActivities = weeklyActivity.reduce(
    (sum, entry) => sum + entry.activityCount,
    0
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      let nextIndex: number | null = null;

      switch (e.key) {
        case "ArrowRight":
          nextIndex = index < weeklyActivity.length - 1 ? index + 1 : index;
          break;
        case "ArrowLeft":
          nextIndex = index > 0 ? index - 1 : index;
          break;
        case "Home":
          nextIndex = 0;
          break;
        case "End":
          nextIndex = weeklyActivity.length - 1;
          break;
        default:
          return;
      }

      if (nextIndex !== null) {
        e.preventDefault();
        setFocusedIndex(nextIndex);
        cellRefs.current[nextIndex]?.focus();
      }
    },
    [weeklyActivity.length]
  );

  return (
    <Card variant="default">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="font-[var(--font-display)] text-base font-bold text-text-primary">
            Weekly Activity
          </h3>
          <Badge variant="default" size="sm">
            Last 7 days
          </Badge>
        </div>
      </CardHeader>
      <CardBody className="pt-0">
        {weeklyActivity.length > 0 ? (
          <>
            {/* Screen reader summary */}
            <p className="sr-only">
              Study activity for the past 7 days. Total:{" "}
              {totalActivities} {totalActivities === 1 ? "activity" : "activities"}.
            </p>

            <div
              role="grid"
              aria-label="Weekly study activity"
              className="grid grid-cols-7 gap-2"
            >
              <div role="row" className="contents">
                {weeklyActivity.map((entry, index) => {
                  const dayFull = getFullDayLabel(entry.date);
                  const intensityLabel = getIntensityLabel(entry.activityCount);
                  const cellLabel = `${dayFull}: ${entry.activityCount} ${entry.activityCount === 1 ? "activity" : "activities"}, ${intensityLabel}`;

                  return (
                    <div
                      key={entry.date}
                      role="gridcell"
                      className="flex flex-col items-center gap-1.5"
                    >
                      <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                        {getDayLabel(entry.date)}
                      </span>
                      <Tooltip
                        content={`${dayFull}: ${entry.activityCount} ${entry.activityCount === 1 ? "activity" : "activities"}`}
                        delayDuration={200}
                      >
                        <div
                          ref={(el) => {
                            cellRefs.current[index] = el;
                          }}
                          aria-label={cellLabel}
                          tabIndex={index === focusedIndex ? 0 : -1}
                          onKeyDown={(e) => handleKeyDown(e, index)}
                          onFocus={() => setFocusedIndex(index)}
                          className={cn(
                            "flex h-12 w-full items-center justify-center rounded-lg border text-xs font-bold tabular-nums transition-colors",
                            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary",
                            entry.active
                              ? "border-accent-primary/20 text-accent-primary"
                              : "border-border-default text-text-muted"
                          )}
                        >
                          <div
                            className={cn(
                              "flex h-full w-full items-center justify-center rounded-lg",
                              getActivityIntensityClass(entry.activityCount)
                            )}
                            aria-hidden="true"
                          >
                            {entry.activityCount}
                          </div>
                        </div>
                      </Tooltip>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="py-6 text-center">
            <Clock
              className="mx-auto h-8 w-8 text-text-muted"
              aria-hidden
            />
            <p className="mt-2 text-xs text-text-secondary">
              No activity data available yet.
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

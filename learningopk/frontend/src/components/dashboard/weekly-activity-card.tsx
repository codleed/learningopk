"use client";

import { useCallback, useMemo, useRef, useState } from "react";
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

/**
 * Richer intensity gradient — from a barely-tinted surface through to a
 * solid accent fill. Uses only design-system token classes.
 */
const getActivityIntensityClass = (count: number): string => {
  if (count === 0) return "bg-bg-subtle";
  if (count <= 1) return "bg-accent-primary/20";
  if (count <= 3) return "bg-accent-primary/45";
  if (count <= 5) return "bg-accent-primary/70";
  return "bg-accent-primary/90";
};

const getIntensityLabel = (count: number): string => {
  if (count === 0) return "no activity";
  if (count <= 1) return "light activity";
  if (count <= 3) return "moderate activity";
  if (count <= 5) return "high activity";
  return "very high activity";
};

/** Check whether a YYYY-MM-DD string matches today (UTC). */
const isToday = (dateStr: string): boolean => {
  const now = new Date();
  const todayUTC = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
  ].join("-");
  return dateStr === todayUTC;
};

/* ------------------------------------------------------------------ */
/*  Legend                                                              */
/* ------------------------------------------------------------------ */

const LEGEND_STEPS: readonly { label: string; className: string }[] = [
  { label: "None", className: "bg-bg-subtle" },
  { label: "Low", className: "bg-accent-primary/20" },
  { label: "Med", className: "bg-accent-primary/45" },
  { label: "High", className: "bg-accent-primary/90" },
] as const;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function WeeklyActivityCard({
  weeklyActivity,
}: WeeklyActivityCardProps) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const cellRefs = useRef<(HTMLDivElement | null)[]>([]);

  const totalActivities = useMemo(
    () => weeklyActivity.reduce((sum, entry) => sum + entry.activityCount, 0),
    [weeklyActivity],
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
    [weeklyActivity.length],
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
              {totalActivities}{" "}
              {totalActivities === 1 ? "activity" : "activities"}.
            </p>

            {/* ── Summary stat ── */}
            <div className="mb-4">
              <Badge variant="primary" size="sm">
                {totalActivities}{" "}
                {totalActivities === 1 ? "activity" : "activities"} this week
              </Badge>
            </div>

            {/* ── Heatmap grid ── */}
            <div
              role="grid"
              aria-label="Weekly study activity"
              className="grid grid-cols-7 gap-2"
            >
              <div role="row" className="contents">
                {weeklyActivity.map((entry, index) => {
                  const dayFull = getFullDayLabel(entry.date);
                  const intensityLabel = getIntensityLabel(
                    entry.activityCount,
                  );
                  const cellLabel = `${dayFull}: ${entry.activityCount} ${entry.activityCount === 1 ? "activity" : "activities"}, ${intensityLabel}`;
                  const today = isToday(entry.date);

                  return (
                    <div
                      key={entry.date}
                      role="gridcell"
                      className="flex flex-col items-center gap-1.5"
                    >
                      {/* Day label — slightly larger and bolder */}
                      <span
                        className={cn(
                          "text-[11px] font-semibold uppercase tracking-wider",
                          today
                            ? "text-accent-primary"
                            : "text-text-muted",
                        )}
                      >
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
                            /* Taller, rounder cells with more visual weight */
                            "flex h-14 w-full items-center justify-center rounded-xl border text-xs font-bold tabular-nums",
                            "transition-all duration-200 ease-out",
                            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary",
                            entry.active
                              ? "border-accent-primary/20 text-accent-primary"
                              : "border-border-default text-text-muted",
                            /* Today highlight ring */
                            today && "ring-2 ring-accent-primary/30",
                          )}
                        >
                          <div
                            className={cn(
                              "flex h-full w-full items-center justify-center rounded-xl",
                              getActivityIntensityClass(entry.activityCount),
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

            {/* ── Legend ── */}
            <div
              className="mt-4 flex items-center justify-end gap-1.5"
              aria-hidden="true"
            >
              <span className="mr-1 text-[10px] font-medium text-text-muted">
                Less
              </span>
              {LEGEND_STEPS.map((step) => (
                <div
                  key={step.label}
                  className={cn(
                    "h-3 w-3 rounded-sm border border-border-default",
                    step.className,
                  )}
                  title={step.label}
                />
              ))}
              <span className="ml-1 text-[10px] font-medium text-text-muted">
                More
              </span>
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

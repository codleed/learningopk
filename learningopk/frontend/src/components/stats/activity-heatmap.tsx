"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import type { DashboardSummaryResponse } from "@/lib/progress-api";

interface ActivityHeatmapProps {
  dailyActivity: DashboardSummaryResponse["dailyActivity"];
}

const WEEKDAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", "Sun"];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const INTENSITY_CLASSES: Record<number, string> = {
  0: "bg-bg-subtle",
  1: "bg-accent-primary/20",
  2: "bg-accent-primary/40",
  3: "bg-accent-primary/65",
  4: "bg-accent-primary",
};

interface DayCell {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  weekday: number;
  weekIndex: number;
}

export function ActivityHeatmap({ dailyActivity }: ActivityHeatmapProps) {
  const { cells, monthMarkers, totalWeeks } = useMemo(() => {
    const activityMap = new Map(
      dailyActivity.map((entry) => [entry.date, { count: entry.count, level: entry.level }])
    );

    const today = new Date();
    const endDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

    /* Go back ~52 weeks (364 days) to fill a full year */
    const startDate = new Date(endDate);
    startDate.setUTCDate(startDate.getUTCDate() - 364);

    /* Adjust start to the nearest Monday */
    const startDow = startDate.getUTCDay();
    const mondayOffset = startDow === 0 ? -6 : 1 - startDow;
    startDate.setUTCDate(startDate.getUTCDate() + mondayOffset);

    const dayCells: DayCell[] = [];
    const months: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;

    const current = new Date(startDate);
    let weekIdx = 0;

    while (current <= endDate) {
      const dow = current.getUTCDay();
      const dayOfWeek = dow === 0 ? 6 : dow - 1; /* Monday=0, Sunday=6 */
      const dateKey = current.toISOString().slice(0, 10);
      const activity = activityMap.get(dateKey);

      const month = current.getUTCMonth();
      if (month !== lastMonth) {
        months.push({ label: MONTH_LABELS[month]!, weekIndex: weekIdx });
        lastMonth = month;
      }

      dayCells.push({
        date: dateKey,
        count: activity?.count ?? 0,
        level: (activity?.level ?? 0) as 0 | 1 | 2 | 3 | 4,
        weekday: dayOfWeek,
        weekIndex: weekIdx,
      });

      current.setUTCDate(current.getUTCDate() + 1);

      /* Advance week on Monday */
      const nextDow = current.getUTCDay();
      const nextDayOfWeek = nextDow === 0 ? 6 : nextDow - 1;
      if (nextDayOfWeek === 0 && current <= endDate) {
        weekIdx++;
      }
    }

    return { cells: dayCells, monthMarkers: months, totalWeeks: weekIdx + 1 };
  }, [dailyActivity]);

  const totalActiveDays = cells.filter((c) => c.count > 0).length;
  const totalActivities = cells.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="space-y-4">
      {/* Summary badges */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-primary/10 px-3 py-1 text-xs font-semibold text-accent-primary">
          {totalActiveDays} active days
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-success/10 px-3 py-1 text-xs font-semibold text-accent-success">
          {totalActivities} total activities
        </span>
      </div>

      {/* Calendar grid */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[720px]">
          {/* Month labels */}
          <div className="flex pl-8 mb-1">
            {monthMarkers.map((marker, idx) => {
              const nextMarker = monthMarkers[idx + 1];
              const span = nextMarker
                ? nextMarker.weekIndex - marker.weekIndex
                : totalWeeks - marker.weekIndex;
              const widthPerWeek = 14; /* ~14px per column cell (10px + 4px gap) */

              return (
                <span
                  key={`${marker.label}-${marker.weekIndex}`}
                  className="text-[10px] font-medium text-text-muted"
                  style={{ width: `${span * widthPerWeek}px`, flexShrink: 0 }}
                >
                  {marker.label}
                </span>
              );
            })}
          </div>

          <div className="flex gap-0">
            {/* Weekday labels */}
            <div className="flex flex-col gap-[3px] pr-2 pt-px">
              {WEEKDAY_LABELS.map((label, idx) => (
                <span
                  key={idx}
                  className="flex h-[10px] items-center text-[9px] font-medium text-text-muted"
                >
                  {label}
                </span>
              ))}
            </div>

            {/* Grid of squares */}
            <div
              className="grid gap-[3px]"
              style={{
                gridTemplateColumns: `repeat(${totalWeeks}, 10px)`,
                gridTemplateRows: "repeat(7, 10px)",
                gridAutoFlow: "column",
              }}
            >
              {cells.map((cell, index) => (
                <motion.div
                  key={cell.date}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    delay: Math.min(index * 0.002, 0.8),
                    duration: 0.2,
                  }}
                  className={cn(
                    "h-[10px] w-[10px] rounded-[2px] transition-colors",
                    INTENSITY_CLASSES[cell.level],
                    cell.count > 0 && "hover:ring-2 hover:ring-accent-primary/30"
                  )}
                  title={`${cell.date}: ${cell.count} activit${cell.count === 1 ? "y" : "ies"}`}
                  style={{ gridRow: cell.weekday + 1 }}
                />
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-text-muted">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={cn(
                  "h-[10px] w-[10px] rounded-[2px]",
                  INTENSITY_CLASSES[level]
                )}
              />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";
import type { DashboardSummaryResponse } from "@/lib/progress-api";

interface ActivityHeatmapProps {
  dailyActivity: DashboardSummaryResponse["dailyActivity"];
}

const WEEKDAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", "Sun"];
const WEEKDAY_FULL_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const INTENSITY_CLASSES: Record<number, string> = {
  0: "bg-bg-subtle",
  1: "bg-accent-primary/20",
  2: "bg-accent-primary/40",
  3: "bg-accent-primary/65",
  4: "bg-accent-primary",
};

const INTENSITY_LABELS: Record<number, string> = {
  0: "no activity",
  1: "light activity",
  2: "moderate activity",
  3: "high activity",
  4: "very high activity",
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
      dailyActivity.map((entry) => [
        entry.date,
        { count: entry.count, level: entry.level },
      ])
    );

    const today = new Date();
    const endDate = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
    );

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

    return {
      cells: dayCells,
      monthMarkers: months,
      totalWeeks: weekIdx + 1,
    };
  }, [dailyActivity]);

  const totalActiveDays = cells.filter((c) => c.count > 0).length;
  const totalActivities = cells.reduce((sum, c) => sum + c.count, 0);

  /* ---------------------------------------------------------------- */
  /*  Keyboard navigation state                                        */
  /* ---------------------------------------------------------------- */

  const [focusedCellIndex, setFocusedCellIndex] = useState(0);
  const cellRefs = useRef<(HTMLDivElement | null)[]>([]);

  /**
   * Build a lookup from (weekIndex, weekday) → cell index for arrow nav.
   * The grid flows column-first: week 0 has days 0-6, week 1 has days 0-6, etc.
   */
  const positionToIndex = useMemo(() => {
    const map = new Map<string, number>();
    cells.forEach((cell, idx) => {
      map.set(`${cell.weekIndex},${cell.weekday}`, idx);
    });
    return map;
  }, [cells]);

  const handleCellKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      const cell = cells[index];
      if (!cell) return;

      let nextWeek = cell.weekIndex;
      let nextDay = cell.weekday;

      switch (e.key) {
        case "ArrowRight":
          nextWeek = cell.weekIndex + 1;
          break;
        case "ArrowLeft":
          nextWeek = cell.weekIndex - 1;
          break;
        case "ArrowDown":
          nextDay = cell.weekday + 1;
          break;
        case "ArrowUp":
          nextDay = cell.weekday - 1;
          break;
        case "Home":
          if (e.ctrlKey) {
            /* Ctrl+Home → first cell */
            e.preventDefault();
            setFocusedCellIndex(0);
            cellRefs.current[0]?.focus();
            return;
          }
          /* Home → first cell in current row (same weekday, first week) */
          nextWeek = 0;
          break;
        case "End":
          if (e.ctrlKey) {
            /* Ctrl+End → last cell */
            e.preventDefault();
            const lastIdx = cells.length - 1;
            setFocusedCellIndex(lastIdx);
            cellRefs.current[lastIdx]?.focus();
            return;
          }
          /* End → last cell in current row (same weekday, last week) */
          nextWeek = totalWeeks - 1;
          break;
        default:
          return;
      }

      e.preventDefault();

      /* Clamp to valid range */
      nextWeek = Math.max(0, Math.min(totalWeeks - 1, nextWeek));
      nextDay = Math.max(0, Math.min(6, nextDay));

      const key = `${nextWeek},${nextDay}`;
      const nextIndex = positionToIndex.get(key);

      if (nextIndex !== undefined) {
        setFocusedCellIndex(nextIndex);
        cellRefs.current[nextIndex]?.focus();
      }
    },
    [cells, positionToIndex, totalWeeks]
  );

  const formatCellLabel = (cell: DayCell): string => {
    const dayName = WEEKDAY_FULL_LABELS[cell.weekday] ?? "";
    const intensity = INTENSITY_LABELS[cell.level] ?? "";
    return `${dayName}, ${cell.date}: ${cell.count} ${cell.count === 1 ? "activity" : "activities"}, ${intensity}`;
  };

  /* ---------------------------------------------------------------- */
  /*  Auto-scroll to most recent (right side) on mobile                */
  /* ---------------------------------------------------------------- */

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) {
      /* Scroll to the far right so the most recent weeks are visible */
      el.scrollLeft = el.scrollWidth;
    }
  }, [cells]);

  /* ---------------------------------------------------------------- */
  /*  Responsive cell sizing                                           */
  /*  Mobile (<md):  8px cells, 2px gaps  →  ~520px total width        */
  /*  Desktop (≥md): 10px cells, 3px gaps →  ~720px total width        */
  /*  CSS custom properties drive the grid so no JS media queries      */
  /* ---------------------------------------------------------------- */

  /**
   * We use CSS custom properties on the container so the grid cells
   * and month labels adapt to the viewport without a media-query hook.
   *
   *   --hm-cell:  cell size (8px mobile / 10px desktop)
   *   --hm-gap:   gap between cells (2px mobile / 3px desktop)
   *   --hm-col:   column pitch = cell + gap  (10px / 13px)
   */

  return (
    <div className="space-y-4">
      {/* Screen reader summary */}
      <p className="sr-only">
        Study activity heatmap for the past year. {totalActiveDays} active days,{" "}
        {totalActivities} total{" "}
        {totalActivities === 1 ? "activity" : "activities"}. Use arrow keys to
        navigate between days.
      </p>

      {/* Summary badges */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-primary/10 px-3 py-1 text-xs font-semibold text-accent-primary">
          {totalActiveDays} active days
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-success/10 px-3 py-1 text-xs font-semibold text-accent-success">
          {totalActivities} total activities
        </span>
      </div>

      {/* Calendar grid — responsive scroll container */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto scroll-smooth pb-2"
        style={
          {
            "--hm-cell": "8px",
            "--hm-gap": "2px",
            "--hm-col": "10px",
          } as React.CSSProperties
        }
      >
        {/*
          Use a CSS media-query-driven wrapper that overrides custom props
          at the md breakpoint via an inline <style> scoped with a data attr.
        */}
        <div
          data-heatmap-grid=""
          className="w-fit"
        >
          {/* Inline responsive style overrides — avoids JS media query hooks */}
          <style
            dangerouslySetInnerHTML={{
              __html: `
                @media (min-width: 768px) {
                  [data-heatmap-grid] {
                    --hm-cell: 10px;
                    --hm-gap: 3px;
                    --hm-col: 13px;
                  }
                }
              `,
            }}
          />

          {/* Month labels */}
          <div
            className="flex mb-1"
            style={{ paddingLeft: "calc(var(--hm-cell) * 3 + var(--hm-gap) * 2)" }}
            aria-hidden="true"
          >
            {monthMarkers.map((marker, idx) => {
              const nextMarker = monthMarkers[idx + 1];
              const span = nextMarker
                ? nextMarker.weekIndex - marker.weekIndex
                : totalWeeks - marker.weekIndex;

              return (
                <span
                  key={`${marker.label}-${marker.weekIndex}`}
                  className="text-[10px] font-medium text-text-muted"
                  style={{
                    width: `calc(${span} * var(--hm-col))`,
                    flexShrink: 0,
                  }}
                >
                  {marker.label}
                </span>
              );
            })}
          </div>

          <div className="flex gap-0">
            {/* Weekday labels */}
            <div
              className="flex flex-col pr-1.5 pt-px md:pr-2"
              style={{ gap: "var(--hm-gap)" }}
              aria-hidden="true"
            >
              {WEEKDAY_LABELS.map((label, idx) => (
                <span
                  key={idx}
                  className="flex items-center text-[9px] font-medium text-text-muted"
                  style={{ height: "var(--hm-cell)" }}
                >
                  {label}
                </span>
              ))}
            </div>

            {/* Grid of squares */}
            <div
              role="grid"
              aria-label="Activity heatmap: yearly study activity calendar"
              className="grid"
              style={{
                gap: "var(--hm-gap)",
                gridTemplateColumns: `repeat(${totalWeeks}, var(--hm-cell))`,
                gridTemplateRows: `repeat(7, var(--hm-cell))`,
                gridAutoFlow: "column",
              }}
            >
              {cells.map((cell, index) => (
                <Tooltip
                  key={cell.date}
                  content={`${cell.date}: ${cell.count} ${cell.count === 1 ? "activity" : "activities"}`}
                  delayDuration={100}
                >
                  <motion.div
                    ref={(el) => {
                      cellRefs.current[index] = el;
                    }}
                    role="gridcell"
                    aria-label={formatCellLabel(cell)}
                    tabIndex={index === focusedCellIndex ? 0 : -1}
                    onKeyDown={(e) => handleCellKeyDown(e, index)}
                    onFocus={() => setFocusedCellIndex(index)}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      delay: Math.min(index * 0.002, 0.8),
                      duration: 0.2,
                    }}
                    className={cn(
                      "rounded-[2px] transition-colors",
                      "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent-primary",
                      INTENSITY_CLASSES[cell.level],
                      cell.count > 0 &&
                        "hover:ring-2 hover:ring-accent-primary/30"
                    )}
                    style={{
                      width: "var(--hm-cell)",
                      height: "var(--hm-cell)",
                      gridRow: cell.weekday + 1,
                    }}
                  />
                </Tooltip>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div
            className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-text-muted"
            aria-hidden="true"
          >
            <span>Less</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={cn(
                  "rounded-[2px]",
                  INTENSITY_CLASSES[level]
                )}
                style={{
                  width: "var(--hm-cell)",
                  height: "var(--hm-cell)",
                }}
              />
            ))}
            <span>More</span>
          </div>
          {/* Screen-reader-friendly legend description */}
          <p className="sr-only">
            Legend: Level 0 is no activity, level 1 is light, level 2 is
            moderate, level 3 is high, level 4 is very high activity.
          </p>
        </div>
      </div>
    </div>
  );
}

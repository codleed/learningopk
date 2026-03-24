"use client";

import { useState } from "react";
import { ActivityCalendar, type Activity, type ThemeInput } from "react-activity-calendar";

import { CaretDown, CaretUp } from "@phosphor-icons/react";

type ConsistencyCalendarProps = {
  dailyActivity: Activity[];
};

const LIGHT_THEME: ThemeInput = {
  light: [
    "rgba(226, 232, 240, 0.3)",
    "#bbf7d0",
    "#86efac",
    "#4ade80",
    "#22c55e",
  ],
};

const DARK_THEME: ThemeInput = {
  dark: [
    "rgba(51, 65, 85, 0.4)",
    "rgba(122, 201, 67, 0.25)",
    "rgba(91, 161, 50, 0.4)",
    "rgba(78, 138, 44, 0.55)",
    "rgba(143, 214, 84, 0.7)",
  ],
};

export function ConsistencyCalendar({ dailyActivity }: ConsistencyCalendarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const totalActivities = dailyActivity.reduce((sum, entry) => sum + entry.count, 0);
  const recentActivities = dailyActivity.slice(-90).reduce((sum, entry) => sum + entry.count, 0);
  const last30Days = dailyActivity.slice(-30).filter((e) => e.count > 0).length;

  const ariaLabel = `Activity calendar showing study consistency over the past year. ${last30Days} active days in the last 30 days. ${totalActivities} total activities recorded.`;

  return (
    <div className="space-y-3">
      <div
        id="consistency-calendar-grid"
        className="overflow-x-auto rounded-lg"
        role="img"
        aria-label={ariaLabel}
      >
        <ActivityCalendar
          data={dailyActivity}
          theme={{
            light: LIGHT_THEME.light!,
            dark: DARK_THEME.dark!,
          }}
          blockSize={12}
          blockRadius={3}
          fontSize={11}
          showWeekdayLabels
          showMonthLabels={isExpanded}
          showColorLegend
          showTotalCount={false}
          tooltips={{
            activity: {
              text: (activity) =>
                `${activity.date}: ${activity.count} ${activity.count === 1 ? "activity" : "activities"}`,
            },
          }}
          labels={{
            totalCount: "{{count}} activities in the last year",
            weekdays: ["S", "M", "T", "W", "T", "F", "S"],
            months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
            legend: {
              less: "Less",
              more: "More",
            },
          }}
        />
      </div>

      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-muted-foreground">
          {recentActivities} activities in the last 90 days
        </p>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-xs font-medium text-foreground transition-colors hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
          aria-expanded={isExpanded}
          aria-controls="consistency-calendar-grid"
        >
          {isExpanded ? (
            <>
              <span>Collapse</span>
              <CaretUp className="h-3 w-3" weight="bold" />
            </>
          ) : (
            <>
              <span>Show full year</span>
              <CaretDown className="h-3 w-3" weight="bold" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

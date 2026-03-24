"use client";

import { ActivityCalendar } from "react-activity-calendar";

import type { DashboardSummaryResponse } from "@/lib/progress-api";

type DailyStreakHeatmapProps = {
  dailyActivity: DashboardSummaryResponse["dailyActivity"];
};

export function DailyStreakHeatmap({ dailyActivity }: DailyStreakHeatmapProps) {
  return (
    <div className="overflow-x-auto" data-testid="daily-streak-heatmap">
      <div className="min-w-[44rem]">
        <ActivityCalendar
          data={dailyActivity}
          theme={{ dark: ["#0d2b1a", "#1a4731", "#25613f", "#2d7a4f", "#38a169"] }}
          blockSize={14}
          blockRadius={3}
          fontSize={12}
          showWeekdayLabels
          labels={{
            totalCount: "{{count}} activities in the last year"
          }}
        />
      </div>
    </div>
  );
}

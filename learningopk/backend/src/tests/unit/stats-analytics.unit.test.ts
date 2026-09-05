import assert from "node:assert/strict";
import test from "node:test";

import {
  buildActivityCalendarSeries,
  buildDailyActivitySeries,
  calculateLongestStreakDays,
} from "../../lib/progress-metrics.js";

test("calculateLongestStreakDays finds the maximum contiguous UTC streak", () => {
  const streak = calculateLongestStreakDays([
    new Date("2026-02-24T03:00:00.000Z"),
    new Date("2026-02-22T03:00:00.000Z"),
    new Date("2026-02-23T03:00:00.000Z"),
    new Date("2026-02-17T03:00:00.000Z"),
    new Date("2026-02-18T03:00:00.000Z"),
    new Date("2026-02-19T03:00:00.000Z"),
    new Date("2026-02-20T03:00:00.000Z"),
  ]);

  assert.equal(streak, 4);
});

test("calculateLongestStreakDays returns zero for empty activity", () => {
  assert.equal(calculateLongestStreakDays([]), 0);
});

test("buildDailyActivitySeries returns ordered zero-filled days in range", () => {
  const counts = new Map<string, number>([
    ["2026-02-22", 3],
    ["2026-02-24", 1],
  ]);

  const series = buildDailyActivitySeries({
    activityDailyCounts: counts,
    endDate: new Date("2026-02-24T12:00:00.000Z"),
    days: 4,
  });

  assert.deepEqual(series, [
    { date: "2026-02-21", active: false, activityCount: 0 },
    { date: "2026-02-22", active: true, activityCount: 3 },
    { date: "2026-02-23", active: false, activityCount: 0 },
    { date: "2026-02-24", active: true, activityCount: 1 },
  ]);
});

test("buildActivityCalendarSeries returns sorted date/count/level entries and always includes today", () => {
  const counts = new Map<string, number>([
    ["2026-02-22", 1],
    ["2026-02-23", 4],
  ]);

  const series = buildActivityCalendarSeries({
    activityDailyCounts: counts,
    endDate: new Date("2026-02-24T12:00:00.000Z"),
    days: 3,
  });

  assert.deepEqual(series, [
    { date: "2026-02-22", count: 1, level: 1 },
    { date: "2026-02-23", count: 4, level: 4 },
    { date: "2026-02-24", count: 0, level: 0 },
  ]);
});

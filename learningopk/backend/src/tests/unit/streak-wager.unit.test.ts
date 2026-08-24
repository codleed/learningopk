import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDailyGoalProgress,
  calculateStreakWagerBonus,
  getCurrentPktContext,
  getPktDateKey,
  getPktDayBounds,
  shouldShowStreakAtRiskWarning,
} from "../../lib/streak-wager.js";

test("getPktDateKey uses explicit PKT day boundaries", () => {
  assert.equal(getPktDateKey(new Date("2026-04-05T18:59:59.000Z")), "2026-04-05");
  assert.equal(getPktDateKey(new Date("2026-04-05T19:00:00.000Z")), "2026-04-06");
});

test("getPktDayBounds maps PKT midnight to UTC correctly", () => {
  const bounds = getPktDayBounds("2026-04-06");

  assert.equal(bounds.startUtc.toISOString(), "2026-04-05T19:00:00.000Z");
  assert.equal(bounds.endUtc.toISOString(), "2026-04-06T19:00:00.000Z");
});

test("buildDailyGoalProgress marks completion only after 3 chapters and 1 quiz", () => {
  const incomplete = buildDailyGoalProgress({
    dateKey: "2026-04-06",
    chaptersCompleted: 2,
    quizzesCompleted: 1,
  });
  const complete = buildDailyGoalProgress({
    dateKey: "2026-04-06",
    chaptersCompleted: 3,
    quizzesCompleted: 1,
  });

  assert.equal(incomplete.completed, false);
  assert.equal(incomplete.percent, 75);
  assert.equal(complete.completed, true);
  assert.equal(complete.percent, 100);
});

test("calculateStreakWagerBonus rounds to nearest XP", () => {
  assert.equal(calculateStreakWagerBonus(25), 13);
  assert.equal(calculateStreakWagerBonus(100), 50);
});

test("shouldShowStreakAtRiskWarning only triggers after 8 PM PKT with no wager", () => {
  assert.equal(
    shouldShowStreakAtRiskWarning({ streakDays: 5, hasWagerForToday: false, pktHour: 20 }),
    true
  );
  assert.equal(
    shouldShowStreakAtRiskWarning({ streakDays: 5, hasWagerForToday: true, pktHour: 20 }),
    false
  );
  assert.equal(
    shouldShowStreakAtRiskWarning({ streakDays: 4, hasWagerForToday: false, pktHour: 20 }),
    false
  );
});

test("getCurrentPktContext exposes the current PKT day key", () => {
  const context = getCurrentPktContext(new Date("2026-04-05T20:30:00.000Z"));

  assert.equal(context.todayKey, "2026-04-06");
  assert.equal(context.pktHour, 1);
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  XP_AWARD_COOLDOWNS,
  hasRecentXpAward,
  nextXpAwardTimestamps,
} from "../../lib/xp-idempotency.js";

const emptyRow = {
  xpAwardedChapterVisitAt: null,
  xpAwardedSummaryReadAt: null,
  xpAwardedFlashcardCompleteAt: null,
  xpAwardedExerciseViewCount: 0,
  xpAwardedExerciseViewWindowStartedAt: null,
} as const;

test("xp-idempotency: never-awarded state allows every event type", () => {
  const now = new Date("2026-09-05T10:00:00.000Z");
  for (const eventType of Object.keys(XP_AWARD_COOLDOWNS) as Array<
    keyof typeof XP_AWARD_COOLDOWNS
  >) {
    assert.equal(
      hasRecentXpAward(emptyRow, eventType, now),
      false,
      `${eventType} should be allowed`
    );
  }
});

test("xp-idempotency: chapter_visit within 24h blocks replay", () => {
  const now = new Date("2026-09-05T10:00:00.000Z");
  const recent = { ...emptyRow, xpAwardedChapterVisitAt: new Date("2026-09-05T09:00:00.000Z") };
  assert.equal(hasRecentXpAward(recent, "chapter_visit", now), true);
});

test("xp-idempotency: chapter_visit older than 24h allows replay", () => {
  const now = new Date("2026-09-05T10:00:00.000Z");
  const stale = { ...emptyRow, xpAwardedChapterVisitAt: new Date("2026-09-04T09:00:00.000Z") };
  assert.equal(hasRecentXpAward(stale, "chapter_visit", now), false);
});

test("xp-idempotency: exercise_view allows 5 per rolling hour then blocks", () => {
  const now = new Date("2026-09-05T10:00:00.000Z");
  const startedAt = new Date("2026-09-05T09:30:00.000Z");
  const at4 = {
    ...emptyRow,
    xpAwardedExerciseViewCount: 4,
    xpAwardedExerciseViewWindowStartedAt: startedAt,
  };
  assert.equal(hasRecentXpAward(at4, "exercise_view", now), false, "5th award is allowed");
  const at5 = {
    ...emptyRow,
    xpAwardedExerciseViewCount: 5,
    xpAwardedExerciseViewWindowStartedAt: startedAt,
  };
  assert.equal(hasRecentXpAward(at5, "exercise_view", now), true, "6th award is blocked");
});

test("xp-idempotency: exercise_view window resets after 1h", () => {
  const now = new Date("2026-09-05T11:00:00.000Z");
  const oldWindow = {
    ...emptyRow,
    xpAwardedExerciseViewCount: 5,
    xpAwardedExerciseViewWindowStartedAt: new Date("2026-09-05T09:30:00.000Z"),
  };
  assert.equal(hasRecentXpAward(oldWindow, "exercise_view", now), false, "window expired");
});

test("nextXpAwardTimestamps: chapter_visit sets the timestamp", () => {
  const now = new Date("2026-09-05T10:00:00.000Z");
  const out = nextXpAwardTimestamps(emptyRow, "chapter_visit", now);
  assert.deepEqual(out, { xpAwardedChapterVisitAt: now });
});

test("nextXpAwardTimestamps: exercise_view increments count and starts a new window when expired", () => {
  const now = new Date("2026-09-05T10:00:00.000Z");
  const old = {
    ...emptyRow,
    xpAwardedExerciseViewCount: 5,
    xpAwardedExerciseViewWindowStartedAt: new Date("2026-09-05T08:00:00.000Z"),
  };
  const out = nextXpAwardTimestamps(old, "exercise_view", now);
  assert.equal(out.xpAwardedExerciseViewCount, 1);
  assert.deepEqual(out.xpAwardedExerciseViewWindowStartedAt, now);
});

test("nextXpAwardTimestamps: exercise_view continues the same window when still active", () => {
  const now = new Date("2026-09-05T10:00:00.000Z");
  const startedAt = new Date("2026-09-05T09:30:00.000Z");
  const fresh = {
    ...emptyRow,
    xpAwardedExerciseViewCount: 2,
    xpAwardedExerciseViewWindowStartedAt: startedAt,
  };
  const out = nextXpAwardTimestamps(fresh, "exercise_view", now);
  assert.equal(out.xpAwardedExerciseViewCount, 3);
  assert.deepEqual(out.xpAwardedExerciseViewWindowStartedAt, startedAt);
});

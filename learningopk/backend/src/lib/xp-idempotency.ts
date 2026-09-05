// Per-(user, chapter, eventType) idempotency windows for XP-awarding progress
// events. The rules below mirror the recommendations in the original
// penetration report (HIGH-001) and are the same defaults the report
// suggested:
//
//   - chapter_visit      : at most once per chapter per 24 h
//   - summary_read       : at most once per chapter per 24 h
//   - exercise_view      : at most 5 per chapter per rolling 1 h
//   - flashcard_complete : at most once per chapter per 24 h
//
// quiz_submit XP is awarded in quiz.service.ts and is out of scope here.

import type { userProgress } from "./db/schema.js";

type UserProgressRow = typeof userProgress.$inferSelect;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export const XP_AWARD_COOLDOWNS = {
  chapter_visit: { kind: "once-per-window" as const, windowMs: DAY_MS },
  summary_read: { kind: "once-per-window" as const, windowMs: DAY_MS },
  flashcard_complete: { kind: "once-per-window" as const, windowMs: DAY_MS },
  exercise_view: { kind: "count-per-window" as const, windowMs: HOUR_MS, max: 5 },
} as const;

export type AwardableEventType = keyof typeof XP_AWARD_COOLDOWNS;

/**
 * Returns true if the same XP award has happened within the cooldown window
 * (i.e. this request should NOT award XP again).
 */
export function hasRecentXpAward(
  row: Pick<
    UserProgressRow,
    | "xpAwardedChapterVisitAt"
    | "xpAwardedSummaryReadAt"
    | "xpAwardedFlashcardCompleteAt"
    | "xpAwardedExerciseViewCount"
    | "xpAwardedExerciseViewWindowStartedAt"
  >,
  eventType: AwardableEventType,
  now: Date = new Date()
): boolean {
  const rule = XP_AWARD_COOLDOWNS[eventType];
  if (rule.kind === "once-per-window") {
    const last =
      eventType === "chapter_visit"
        ? row.xpAwardedChapterVisitAt
        : eventType === "summary_read"
          ? row.xpAwardedSummaryReadAt
          : row.xpAwardedFlashcardCompleteAt;
    if (!last) return false;
    return now.getTime() - last.getTime() < rule.windowMs;
  }
  // count-per-window
  const startedAt = row.xpAwardedExerciseViewWindowStartedAt;
  if (!startedAt) return false;
  const elapsed = now.getTime() - startedAt.getTime();
  if (elapsed >= rule.windowMs) return false; // window expired - not blocked
  return row.xpAwardedExerciseViewCount >= rule.max;
}

/**
 * Returns the column-update payload that should be applied to user_progress
 * after a successful XP award. Callers must merge this into their existing
 * update; this helper does not persist.
 */
export function nextXpAwardTimestamps(
  current: Pick<
    UserProgressRow,
    | "xpAwardedChapterVisitAt"
    | "xpAwardedSummaryReadAt"
    | "xpAwardedFlashcardCompleteAt"
    | "xpAwardedExerciseViewCount"
    | "xpAwardedExerciseViewWindowStartedAt"
  >,
  eventType: AwardableEventType,
  now: Date = new Date()
): {
  xpAwardedChapterVisitAt?: Date;
  xpAwardedSummaryReadAt?: Date;
  xpAwardedFlashcardCompleteAt?: Date;
  xpAwardedExerciseViewCount?: number;
  xpAwardedExerciseViewWindowStartedAt?: Date;
} {
  if (eventType === "chapter_visit") {
    return { xpAwardedChapterVisitAt: now };
  }
  if (eventType === "summary_read") {
    return { xpAwardedSummaryReadAt: now };
  }
  if (eventType === "flashcard_complete") {
    return { xpAwardedFlashcardCompleteAt: now };
  }
  // exercise_view: rolling 1-hour bucket of up to 5 awards.
  const rule = XP_AWARD_COOLDOWNS.exercise_view;
  const startedAt = current.xpAwardedExerciseViewWindowStartedAt;
  const windowExpired = !startedAt || now.getTime() - startedAt.getTime() >= rule.windowMs;
  return {
    xpAwardedExerciseViewCount: windowExpired ? 1 : current.xpAwardedExerciseViewCount + 1,
    xpAwardedExerciseViewWindowStartedAt: windowExpired ? now : startedAt,
  };
}

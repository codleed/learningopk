import assert from "node:assert/strict";
import test from "node:test";

import { buildTodaysFocus } from "../../lib/todays-focus.js";

test("buildTodaysFocus prioritizes weak quiz chapters before other candidates", () => {
  const focus = buildTodaysFocus({
    now: new Date("2026-03-02T12:00:00.000Z"),
    streakDays: 6,
    hasActivityToday: false,
    ramadanConfig: { enabled: false, fastingStartHour: 4, fastingEndHour: 18 },
    chapters: [
      {
        chapterId: 11,
        chapterNumber: 2,
        chapterSlug: "forces",
        chapterTitle: "Forces",
        subjectId: 5,
        subjectName: "Physics",
        subjectSlug: "physics",
        boardSlug: "fbise",
        grade: "9",
        visited: true,
        quizAttemptsCount: 1,
        bestQuizScorePercent: 42,
        examDate: "2026-04-10T00:00:00.000Z"
      },
      {
        chapterId: 12,
        chapterNumber: 3,
        chapterSlug: "motion",
        chapterTitle: "Motion",
        subjectId: 5,
        subjectName: "Physics",
        subjectSlug: "physics",
        boardSlug: "fbise",
        grade: "9",
        visited: false,
        quizAttemptsCount: 0,
        bestQuizScorePercent: 0,
        examDate: "2026-03-20T00:00:00.000Z"
      }
    ]
  });

  assert.ok(focus);
  assert.equal(focus?.type, "weak_quiz");
  assert.equal(focus?.chapterId, 11);
  assert.equal(focus?.difficulty, "hard");
  assert.equal(focus?.xpReward, 15);
  assert.match(focus?.href ?? "", /forces\?tab=quiz$/);
});

test("buildTodaysFocus uses a streak rescue focus when no weak quiz exists", () => {
  const focus = buildTodaysFocus({
    now: new Date("2026-03-12T16:00:00.000Z"),
    streakDays: 4,
    hasActivityToday: false,
    ramadanConfig: { enabled: false, fastingStartHour: 4, fastingEndHour: 18 },
    chapters: [
      {
        chapterId: 21,
        chapterNumber: 1,
        chapterSlug: "cells",
        chapterTitle: "Cells",
        subjectId: 7,
        subjectName: "Biology",
        subjectSlug: "biology",
        boardSlug: "fbise",
        grade: "9",
        visited: false,
        quizAttemptsCount: 0,
        bestQuizScorePercent: 0,
        examDate: null
      }
    ]
  });

  assert.ok(focus);
  assert.equal(focus?.type, "streak_at_risk");
  assert.equal(focus?.difficulty, "easy");
  assert.equal(focus?.xpReward, 5);
  assert.match(focus?.reason ?? "", /streak/i);
});

test("buildTodaysFocus picks the nearest exam unvisited chapter when no higher-priority goal exists", () => {
  const focus = buildTodaysFocus({
    now: new Date("2026-02-18T10:00:00.000Z"),
    streakDays: 0,
    hasActivityToday: true,
    ramadanConfig: { enabled: false, fastingStartHour: 4, fastingEndHour: 18 },
    chapters: [
      {
        chapterId: 31,
        chapterNumber: 4,
        chapterSlug: "chemical-bonding",
        chapterTitle: "Chemical Bonding",
        subjectId: 8,
        subjectName: "Chemistry",
        subjectSlug: "chemistry",
        boardSlug: "fbise",
        grade: "10",
        visited: false,
        quizAttemptsCount: 0,
        bestQuizScorePercent: 0,
        examDate: "2026-04-01T00:00:00.000Z"
      },
      {
        chapterId: 32,
        chapterNumber: 2,
        chapterSlug: "atomic-structure",
        chapterTitle: "Atomic Structure",
        subjectId: 9,
        subjectName: "Chemistry Advanced",
        subjectSlug: "chemistry-advanced",
        boardSlug: "fbise",
        grade: "10",
        visited: false,
        quizAttemptsCount: 0,
        bestQuizScorePercent: 0,
        examDate: "2026-03-01T00:00:00.000Z"
      }
    ]
  });

  assert.ok(focus);
  assert.equal(focus?.type, "exam_countdown");
  assert.equal(focus?.chapterId, 32);
  assert.equal(focus?.difficulty, "medium");
  assert.equal(focus?.xpReward, 10);
});

test("buildTodaysFocus shortens sessions during Ramadan fasting hours", () => {
  const focus = buildTodaysFocus({
    now: new Date("2026-03-10T08:00:00.000Z"),
    streakDays: 0,
    hasActivityToday: true,
    ramadanConfig: { enabled: true, fastingStartHour: 4, fastingEndHour: 18 },
    chapters: [
      {
        chapterId: 41,
        chapterNumber: 6,
        chapterSlug: "waves",
        chapterTitle: "Waves",
        subjectId: 10,
        subjectName: "Physics",
        subjectSlug: "physics",
        boardSlug: "fbise",
        grade: "10",
        visited: false,
        quizAttemptsCount: 0,
        bestQuizScorePercent: 0,
        examDate: "2026-05-01T00:00:00.000Z"
      }
    ]
  });

  assert.ok(focus);
  assert.equal(focus?.isRamadanAdjusted, true);
  assert.ok((focus?.durationMinutes ?? 0) >= 3);
  assert.ok((focus?.durationMinutes ?? 0) <= 5);
});

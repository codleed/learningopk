import assert from "node:assert/strict";
import test from "node:test";

import { progressEventSchema, subjectParamSchema } from "../../routes/progress.js";
import { submitQuizSchema } from "../../routes/quiz.js";

test("submitQuizSchema accepts a valid quiz submission payload", () => {
  const payload = {
    quizId: 1,
    answers: {
      "101": "a",
      "102": "d"
    },
    startedAt: "2026-02-24T10:00:00.000Z"
  };

  const parsed = submitQuizSchema.safeParse(payload);
  assert.equal(parsed.success, true);
});

test("submitQuizSchema rejects answer keys that are not numeric question IDs", () => {
  const payload = {
    quizId: 1,
    answers: {
      "question-101": "a"
    }
  };

  const parsed = submitQuizSchema.safeParse(payload);
  assert.equal(parsed.success, false);
});

test("progressEventSchema accepts quiz_submit with non-negative score", () => {
  const payload = {
    eventType: "quiz_submit",
    chapterId: 7,
    score: 9
  };

  const parsed = progressEventSchema.safeParse(payload);
  assert.equal(parsed.success, true);
});

test("progressEventSchema rejects quiz_submit with negative score", () => {
  const payload = {
    eventType: "quiz_submit",
    chapterId: 7,
    score: -1
  };

  const parsed = progressEventSchema.safeParse(payload);
  assert.equal(parsed.success, false);
});

test("subjectParamSchema accepts lowercase slug route params", () => {
  const parsed = subjectParamSchema.safeParse({
    subject: "mathematics-grade-9"
  });
  assert.equal(parsed.success, true);
});

test("subjectParamSchema rejects invalid slug characters", () => {
  const parsed = subjectParamSchema.safeParse({
    subject: "Mathematics Grade 9"
  });
  assert.equal(parsed.success, false);
});

import assert from "node:assert/strict";
import test from "node:test";

import { scoreQuizSubmission } from "../../lib/quiz-scoring.js";
import { calculateStreakDays, scoreToPercent } from "../../lib/progress-metrics.js";

test("scoreQuizSubmission calculates marks and percentage from answers", () => {
  const result = scoreQuizSubmission({
    questionRows: [
      {
        id: 1,
        question: "Q1",
        optionA: "A",
        optionB: "B",
        optionC: "C",
        optionD: "D",
        correctOption: "a",
        explanation: "exp1",
        marks: 2
      },
      {
        id: 2,
        question: "Q2",
        optionA: "A",
        optionB: "B",
        optionC: "C",
        optionD: "D",
        correctOption: "b",
        explanation: "exp2",
        marks: 3
      }
    ],
    answers: {
      "1": "a",
      "2": "d"
    },
    configuredTotalMarks: 5
  });

  assert.equal(result.score, 2);
  assert.equal(result.totalMarks, 5);
  assert.equal(result.percentage, 40);
  assert.equal(result.questionResults[0]?.isCorrect, true);
  assert.equal(result.questionResults[1]?.isCorrect, false);
});

test("scoreQuizSubmission falls back to calculated total marks when configured total is zero", () => {
  const result = scoreQuizSubmission({
    questionRows: [
      {
        id: 1,
        question: "Q1",
        optionA: "A",
        optionB: "B",
        optionC: "C",
        optionD: "D",
        correctOption: "c",
        explanation: "exp1",
        marks: 4
      }
    ],
    answers: {
      "1": "c"
    },
    configuredTotalMarks: 0
  });

  assert.equal(result.totalMarks, 4);
  assert.equal(result.score, 4);
  assert.equal(result.percentage, 100);
});

test("scoreToPercent clamps values and handles zero denominator", () => {
  assert.equal(scoreToPercent(4, 5), 80);
  assert.equal(scoreToPercent(7, 5), 100);
  assert.equal(scoreToPercent(-2, 5), 0);
  assert.equal(scoreToPercent(3, 0), 0);
});

test("calculateStreakDays counts only contiguous active UTC days ending today", () => {
  const referenceDate = new Date("2026-02-24T12:00:00.000Z");

  const streak = calculateStreakDays(
    [
      new Date("2026-02-24T03:00:00.000Z"),
      new Date("2026-02-23T11:00:00.000Z"),
      new Date("2026-02-22T22:00:00.000Z"),
      new Date("2026-02-20T22:00:00.000Z")
    ],
    referenceDate
  );

  assert.equal(streak, 3);
});

test("calculateStreakDays returns zero when no activity exists today", () => {
  const referenceDate = new Date("2026-02-24T12:00:00.000Z");

  const streak = calculateStreakDays([new Date("2026-02-23T10:00:00.000Z")], referenceDate);

  assert.equal(streak, 0);
});

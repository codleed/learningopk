import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { gradeMcq, gradeFillInBlanks, autoGradeExercises, calculateTotalScore } from "../../services/past-paper-grading.service.js";

describe("gradeMcq", () => {
  it("awards full marks for correct answer", () => {
    const result = gradeMcq(
      { id: 1, type: "mcq", correctOption: "b", marks: 2 },
      "b"
    );
    assert.equal(result.score, 2);
    assert.equal(result.isCorrect, true);
  });

  it("awards 0 for wrong answer", () => {
    const result = gradeMcq(
      { id: 1, type: "mcq", correctOption: "b", marks: 2 },
      "a"
    );
    assert.equal(result.score, 0);
    assert.equal(result.isCorrect, false);
  });

  it("handles case-insensitive matching", () => {
    const result = gradeMcq(
      { id: 1, type: "mcq", correctOption: "B", marks: 1 },
      "b"
    );
    assert.equal(result.isCorrect, true);
  });

  it("returns 0 for missing correctOption", () => {
    const result = gradeMcq(
      { id: 1, type: "mcq", marks: 5 },
      "b"
    );
    assert.equal(result.score, 0);
  });

  it("defaults marks to 1 when not specified", () => {
    const result = gradeMcq(
      { id: 1, type: "mcq", correctOption: "a" },
      "a"
    );
    assert.equal(result.score, 1);
  });
});

describe("gradeFillInBlanks", () => {
  it("awards full marks when all blanks match from blanksAnswer", () => {
    const result = gradeFillInBlanks(
      { id: 1, type: "fill_in_blanks", blanksAnswer: ["H2O", "CO2"], marks: 2 },
      ["H2O", "CO2"]
    );
    assert.equal(result.score, 2);
    assert.equal(result.totalBlanks, 2);
    assert.equal(result.correctBlanks, 2);
    assert.equal(result.isCorrect, true);
  });

  it("awards partial marks for partial match", () => {
    const result = gradeFillInBlanks(
      { id: 1, type: "fill_in_blanks", blanksAnswer: ["H2O", "CO2"], marks: 4 },
      ["H2O", "wrong"]
    );
    assert.equal(result.score, 2);
    assert.equal(result.isCorrect, true);
  });

  it("awards 0 marks for no correct blanks", () => {
    const result = gradeFillInBlanks(
      { id: 1, type: "fill_in_blanks", blanksAnswer: ["answer1", "answer2"], marks: 2 },
      ["wrong1", "wrong2"]
    );
    assert.equal(result.score, 0);
    assert.equal(result.isCorrect, false);
  });

  it("handles empty answers array", () => {
    const result = gradeFillInBlanks(
      { id: 1, type: "fill_in_blanks", blanksAnswer: ["test"], marks: 2 },
      []
    );
    assert.equal(result.score, 0);
  });

  it("handles case-insensitive matching", () => {
    const result = gradeFillInBlanks(
      { id: 1, type: "fill_in_blanks", blanksAnswer: ["H2O"], marks: 1 },
      ["h2o"]
    );
    assert.equal(result.correctBlanks, 1);
  });

  it("combines blanks from statements", () => {
    const result = gradeFillInBlanks(
      {
        id: 1,
        type: "fill_in_blanks",
        blanksAnswer: ["apple"],
        statements: [{ text: "The ___ is red", blanksAnswer: ["sky"] }],
        marks: 4
      },
      ["apple", "sky"]
    );
    assert.equal(result.totalBlanks, 2);
    assert.equal(result.correctBlanks, 2);
    assert.equal(result.score, 4);
  });
});

describe("autoGradeExercises", () => {
  it("auto-grades MCQs and marks short/long for AI grading", () => {
    const result = autoGradeExercises(
      [
        { id: 1, type: "mcq", correctOption: "a", marks: 2 },
        { id: 2, type: "short", marks: 5 },
        { id: 3, type: "fill_in_blanks", blanksAnswer: ["test"], marks: 1 },
        { id: 4, type: "long", marks: 10 },
      ],
      {
        1: "a",
        2: "some answer",
        3: ["test"],
        4: "long answer",
      }
    );

    assert.equal(result[0]!.exerciseId, 1);
    assert.equal(result[0]!.score, 2);
    assert.equal(result[0]!.needsAiGrading, false);

    assert.equal(result[1]!.exerciseId, 2);
    assert.equal(result[1]!.score, 0);
    assert.equal(result[1]!.needsAiGrading, true);

    assert.equal(result[2]!.exerciseId, 3);
    assert.equal(result[2]!.score, 1);
    assert.equal(result[2]!.needsAiGrading, false);

    assert.equal(result[3]!.exerciseId, 4);
    assert.equal(result[3]!.needsAiGrading, true);
  });
});

describe("calculateTotalScore", () => {
  it("calculates correct totals and percentage", () => {
    const graded = [
      { exerciseId: 1, score: 3, maxMarks: 5, isCorrect: true, needsAiGrading: false },
      { exerciseId: 2, score: 2, maxMarks: 5, isCorrect: false, needsAiGrading: false },
    ];
    const result = calculateTotalScore(graded);
    assert.equal(result.totalScore, 5);
    assert.equal(result.totalMarks, 10);
    assert.equal(result.percentage, 50);
  });

  it("handles perfect score", () => {
    const graded = [
      { exerciseId: 1, score: 10, maxMarks: 10, isCorrect: true, needsAiGrading: false },
    ];
    const result = calculateTotalScore(graded);
    assert.equal(result.percentage, 100);
  });

  it("handles zero total marks", () => {
    const graded = [
      { exerciseId: 1, score: 0, maxMarks: 0, isCorrect: false, needsAiGrading: false },
    ];
    const result = calculateTotalScore(graded);
    assert.equal(result.percentage, 0);
  });
});

import assert from "node:assert/strict";
import test from "node:test";

import { buildTutorSystemPrompt } from "../../lib/mistral.js";

test("buildTutorSystemPrompt mentions quiz-derived weak areas when available", () => {
  const prompt = buildTutorSystemPrompt({
    context: {
      board: "FBISE",
      grade: "9",
      subject: "Physics",
      chapterTitle: "Kinematics",
      chapterSummary: "Motion in a straight line."
    },
    failedAttempts: 0,
    personalContext: {
      weakTopics: ["motion graphs"],
      strongTopics: ["units"],
      studentWeakAreas: ["acceleration formula", "velocity-time graphs"],
      preferredExplanationStyle: "balanced",
      lastConceptsDiscussed: ["displacement"]
    }
  });

  assert.match(prompt, /quiz history/i);
  assert.match(prompt, /acceleration formula/i);
  assert.match(prompt, /velocity-time graphs/i);
});

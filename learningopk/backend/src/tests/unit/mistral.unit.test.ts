import assert from "node:assert/strict";
import test from "node:test";

import { buildTutorSystemPrompt } from "../../lib/mistral.js";

const baseContext = {
  board: "FBISE",
  grade: "9" as const,
  subject: "Physics",
  chapterTitle: "Kinematics",
  chapterSummary: "Motion in a straight line."
};

test("buildTutorSystemPrompt mentions quiz-derived weak areas when available", () => {
  const prompt = buildTutorSystemPrompt({
    context: baseContext,
    failedAttempts: 0,
    mode: "socratic",
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

test("buildTutorSystemPrompt explain mode requests direct markdown explanations with latex math", () => {
  const prompt = buildTutorSystemPrompt({
    context: baseContext,
    failedAttempts: 0,
    mode: "explain"
  });

  assert.match(prompt, /direct explanation first/i);
  assert.match(prompt, /valid markdown/i);
  assert.match(prompt, /\$\.\.\.\$/);
  assert.match(prompt, /\$\$\.\.\.\$\$/);
  assert.match(prompt, /NEVER use square-bracket/i);
  assert.match(prompt, /## idea/i);
  assert.doesNotMatch(prompt, /guide question/i);
});

test("buildTutorSystemPrompt socratic mode requests a tiny hint followed by one guiding question", () => {
  const prompt = buildTutorSystemPrompt({
    context: baseContext,
    failedAttempts: 0,
    mode: "socratic"
  });

  assert.match(prompt, /socratic/i);
  assert.match(prompt, /tiny hint first when useful/i);
  assert.match(prompt, /one focused guiding question/i);
  assert.match(prompt, /do not reveal the answer yet/i);
  assert.match(prompt, /NEVER use square-bracket/i);
  assert.match(prompt, /\$F = ma\$/);
});

test("buildTutorSystemPrompt core rules include dollar-sign delimiter instruction", () => {
  const prompt = buildTutorSystemPrompt({
    context: baseContext,
    failedAttempts: 0,
    mode: "explain"
  });

  // Core rules section should mention dollar-sign math delimiters
  assert.match(prompt, /\$\.\.\.\$ for inline math/);
  assert.match(prompt, /\$\$\.\.\.\$\$ for block math/);
  // Should explicitly forbid bracket delimiters
  assert.match(prompt, /NEVER.*\\\[/i);
});

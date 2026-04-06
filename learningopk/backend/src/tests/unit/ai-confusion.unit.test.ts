import assert from "node:assert/strict";
import test from "node:test";

import { buildProactiveHint, detectConfusionPattern } from "../../lib/ai-confusion.js";

test("detectConfusionPattern triggers for three short consecutive user turns", () => {
  const result = detectConfusionPattern({
    messages: [
      { role: "user", content: "help" },
      { role: "assistant", content: "What part feels unclear?" },
      { role: "user", content: "idk" },
      { role: "assistant", content: "Try describing the step that feels hard." },
      { role: "user", content: "still lost" }
    ]
  });

  assert.equal(result.triggered, true);
  assert.ok(result.reasons.includes("short_consecutive_messages"));
});

test("detectConfusionPattern triggers for repeated wrong answer after corrective assistant cue", () => {
  const result = detectConfusionPattern({
    messages: [
      { role: "assistant", content: "What is 2 + 2?" },
      { role: "user", content: "5" },
      { role: "assistant", content: "Not quite. Try again." },
      { role: "user", content: "5" }
    ]
  });

  assert.equal(result.triggered, true);
  assert.ok(result.reasons.includes("identical_wrong_answers"));
});

test("detectConfusionPattern triggers for off-topic keywords", () => {
  const result = detectConfusionPattern({
    messages: [
      { role: "assistant", content: "Let's focus on forces." },
      { role: "user", content: "tell me a joke" }
    ]
  });

  assert.equal(result.triggered, true);
  assert.ok(result.reasons.includes("off_topic_keywords"));
});

test("buildProactiveHint uses the supplied topic", () => {
  assert.equal(
    buildProactiveHint("Newton's Third Law"),
    "It looks like you're working through Newton's Third Law. Would you like me to break this down differently?"
  );
});

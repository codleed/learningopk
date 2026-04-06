import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyAiQuery,
  createAiModelStrategy,
  type AiModelTier,
} from "../../services/ai-model-strategy.js";

test("classifyAiQuery marks short factual recall as simple within 50ms", () => {
  const startedAt = Date.now();
  const result = classifyAiQuery("What is the chemical formula of water?");
  const durationMs = Date.now() - startedAt;

  assert.equal(result.classification, "simple");
  assert.equal(result.modelTier, "mistral-tiny");
  assert.ok(durationMs < 50, `expected classifier under 50ms, received ${durationMs}ms`);
});

test("classifyAiQuery marks multi-step reasoning prompts as complex", () => {
  const result = classifyAiQuery(
    "Explain step by step how to solve this quadratic equation and why each transformation works before giving the final answer."
  );

  assert.equal(result.classification, "complex");
  assert.equal(result.modelTier, "mistral-medium");
});

test("classifyAiQuery keeps ordinary tutoring prompts on the standard tier", () => {
  const result = classifyAiQuery("Can you explain Newton's third law with a simple classroom example?");

  assert.equal(result.classification, "standard");
  assert.equal(result.modelTier, "mistral-small");
});

test("strategy falls back across tiers with exponential backoff", async () => {
  const attempts: AiModelTier[] = [];
  const backoffs: number[] = [];

  const strategy = createAiModelStrategy({
    readCircuitState: async () => ({ consecutiveFailures: 0, lastFailureAt: null, openedAt: null }),
    writeCircuitState: async () => undefined,
    getCachedResponse: async () => null,
    setCachedResponse: async () => undefined,
    invokeModel: async ({ tier }) => {
      attempts.push(tier);
      if (attempts.length < 3) {
        throw new Error(`provider failure ${attempts.length}`);
      }

      return {
        text: "Fallback answer",
        model: "mistral-medium",
        modelTier: tier,
        promptTokens: 12,
        completionTokens: 8,
      };
    },
    sleep: async (delayMs) => {
      backoffs.push(delayMs);
    },
  });

  const result = await strategy.generate({
    prompt: "What is velocity?",
    messages: [{ role: "user", content: "What is velocity?" }],
    system: "You are a tutor.",
    maxOutputTokens: 50,
    temperature: 0.7,
  });

  assert.equal(result.source, "provider");
  assert.deepEqual(attempts, ["mistral-tiny", "mistral-small", "mistral-medium"]);
  assert.deepEqual(backoffs, [200, 400]);
});

test("strategy opens the circuit after five failures in one minute and uses normalized prompt cache", async () => {
  const stateByKey = new Map<string, { consecutiveFailures: number; lastFailureAt: number | null; openedAt: number | null }>();
  const cacheByPrompt = new Map<string, string>();

  const strategy = createAiModelStrategy({
    readCircuitState: async ({ key }) => stateByKey.get(key) ?? { consecutiveFailures: 0, lastFailureAt: null, openedAt: null },
    writeCircuitState: async ({ key, state }) => {
      stateByKey.set(key, state);
    },
    getCachedResponse: async ({ normalizedPrompt }) => cacheByPrompt.get(normalizedPrompt) ?? null,
    setCachedResponse: async ({ normalizedPrompt, responseText }) => {
      cacheByPrompt.set(normalizedPrompt, responseText);
    },
    invokeModel: async () => {
      throw new Error("provider unavailable");
    },
    sleep: async () => undefined,
  });

  let finalError: unknown;
  for (let index = 0; index < 5; index += 1) {
    try {
      await strategy.generate({
        prompt: "Explain photosynthesis",
        messages: [{ role: "user", content: "Explain photosynthesis" }],
        system: "You are a tutor.",
        maxOutputTokens: 50,
        temperature: 0.7,
      });
    } catch (error) {
      finalError = error;
    }
  }

  assert.ok(finalError instanceof Error);

  await strategy.primeCachedResponse({
    prompt: " Explain   photosynthesis ",
    responseText: "Cached tutor answer",
  });

  const cachedResult = await strategy.generate({
    prompt: "explain photosynthesis",
    messages: [{ role: "user", content: "Explain photosynthesis" }],
    system: "You are a tutor.",
    maxOutputTokens: 50,
    temperature: 0.7,
  });

  assert.equal(cachedResult.source, "cache");
  assert.equal(cachedResult.text, "Cached tutor answer");
  assert.equal(cachedResult.modelTier, "mistral-small");
});

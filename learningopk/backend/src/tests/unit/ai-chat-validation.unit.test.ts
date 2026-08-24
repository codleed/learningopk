import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";

/**
 * Mirror of chatInputSchema from routes/ai-chat.ts — kept in sync manually.
 * We duplicate rather than export to avoid coupling route internals to tests.
 */
const USER_MESSAGE_MAX_LENGTH = 4000;
const ASSISTANT_MESSAGE_MAX_LENGTH = 16_000;

const chatMessageSchema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("user"),
    content: z.string().trim().min(1).max(USER_MESSAGE_MAX_LENGTH),
  }),
  z.object({
    role: z.literal("assistant"),
    content: z.string().trim().min(1).max(ASSISTANT_MESSAGE_MAX_LENGTH),
  }),
]);

const chatInputSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(40),
  mode: z.enum(["explain", "socratic"]).default("explain"),
  chapterId: z.number().int().positive().optional(),
  sessionId: z.string().uuid().optional(),
});

// ── Messages validation ─────────────────────────────────────────────────

test("chatInputSchema rejects messages with empty content", () => {
  const result = chatInputSchema.safeParse({
    messages: [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "" },
    ],
  });
  assert.equal(result.success, false, "empty assistant content should be rejected");
});

test("chatInputSchema rejects messages with whitespace-only content", () => {
  const result = chatInputSchema.safeParse({
    messages: [{ role: "user", content: "  " }],
  });
  assert.equal(result.success, false, "whitespace-only user content should be rejected");
});

test("chatInputSchema rejects empty messages array", () => {
  const result = chatInputSchema.safeParse({
    messages: [],
  });
  assert.equal(result.success, false, "empty messages array should be rejected");
});

test("chatInputSchema accepts valid messages with non-empty content", () => {
  const result = chatInputSchema.safeParse({
    messages: [
      { role: "user", content: "Help me with physics" },
      { role: "assistant", content: "Sure! What topic?" },
      { role: "user", content: "Newton's laws" },
    ],
  });
  assert.equal(result.success, true, "valid messages should pass");
});

// ── sessionId validation ────────────────────────────────────────────────

test("chatInputSchema rejects empty string sessionId", () => {
  const result = chatInputSchema.safeParse({
    messages: [{ role: "user", content: "Hello" }],
    sessionId: "",
  });
  assert.equal(result.success, false, "empty string sessionId should be rejected");
});

test("chatInputSchema rejects non-UUID sessionId", () => {
  const result = chatInputSchema.safeParse({
    messages: [{ role: "user", content: "Hello" }],
    sessionId: "not-a-uuid",
  });
  assert.equal(result.success, false, "non-UUID sessionId should be rejected");
});

test("chatInputSchema accepts valid UUID sessionId", () => {
  const result = chatInputSchema.safeParse({
    messages: [{ role: "user", content: "Hello" }],
    sessionId: "550e8400-e29b-41d4-a716-446655440000",
  });
  assert.equal(result.success, true, "valid UUID sessionId should pass");
});

test("chatInputSchema accepts omitted sessionId", () => {
  const result = chatInputSchema.safeParse({
    messages: [{ role: "user", content: "Hello" }],
  });
  assert.equal(result.success, true, "omitted sessionId should pass");
});

// ── chapterId validation ────────────────────────────────────────────────

test("chatInputSchema rejects zero chapterId", () => {
  const result = chatInputSchema.safeParse({
    messages: [{ role: "user", content: "Hello" }],
    chapterId: 0,
  });
  assert.equal(result.success, false, "chapterId 0 should be rejected (positive required)");
});

test("chatInputSchema rejects negative chapterId", () => {
  const result = chatInputSchema.safeParse({
    messages: [{ role: "user", content: "Hello" }],
    chapterId: -5,
  });
  assert.equal(result.success, false, "negative chapterId should be rejected");
});

test("chatInputSchema accepts positive integer chapterId", () => {
  const result = chatInputSchema.safeParse({
    messages: [{ role: "user", content: "Hello" }],
    chapterId: 42,
  });
  assert.equal(result.success, true, "positive integer chapterId should pass");
});

test("chatInputSchema accepts omitted chapterId", () => {
  const result = chatInputSchema.safeParse({
    messages: [{ role: "user", content: "Hello" }],
  });
  assert.equal(result.success, true, "omitted chapterId should pass");
});

// ── User content length validation ──────────────────────────────────────

test("chatInputSchema rejects user content exceeding 4000 characters", () => {
  const result = chatInputSchema.safeParse({
    messages: [{ role: "user", content: "x".repeat(4001) }],
  });
  assert.equal(result.success, false, "user content over 4000 chars should be rejected");
});

test("chatInputSchema accepts user content at exactly 4000 characters", () => {
  const result = chatInputSchema.safeParse({
    messages: [{ role: "user", content: "x".repeat(4000) }],
  });
  assert.equal(result.success, true, "user content at exactly 4000 chars should pass");
});

// ── Assistant content length (higher limit) ─────────────────────────────

test("chatInputSchema accepts assistant content up to 16000 characters", () => {
  const result = chatInputSchema.safeParse({
    messages: [
      { role: "user", content: "Explain everything" },
      { role: "assistant", content: "x".repeat(16_000) },
    ],
  });
  assert.equal(result.success, true, "assistant content at 16000 chars should pass");
});

test("chatInputSchema rejects assistant content exceeding 16000 characters", () => {
  const result = chatInputSchema.safeParse({
    messages: [
      { role: "user", content: "Explain everything" },
      { role: "assistant", content: "x".repeat(16_001) },
    ],
  });
  assert.equal(result.success, false, "assistant content over 16000 chars should be rejected");
});

test("chatInputSchema accepts typical AI response length (8000 chars) from assistant", () => {
  const result = chatInputSchema.safeParse({
    messages: [
      { role: "user", content: "Help me with physics" },
      { role: "assistant", content: "x".repeat(8000) },
      { role: "user", content: "Tell me more" },
    ],
  });
  assert.equal(result.success, true, "8000-char assistant response in conversation should pass");
});

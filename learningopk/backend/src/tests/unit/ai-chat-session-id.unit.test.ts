import assert from "node:assert/strict";
import test from "node:test";

import { normalizeSessionId, withPersistedChapterSession } from "@learningopk/shared/utils";

test("normalizeSessionId treats blank values as no active session", () => {
  assert.equal(normalizeSessionId(""), null);
  assert.equal(normalizeSessionId("   "), null);
  assert.equal(normalizeSessionId(undefined), null);
  assert.equal(normalizeSessionId(null), null);
});

test("normalizeSessionId preserves non-empty session IDs", () => {
  assert.equal(
    normalizeSessionId("550e8400-e29b-41d4-a716-446655440000"),
    "550e8400-e29b-41d4-a716-446655440000"
  );
  assert.equal(
    normalizeSessionId(" 550e8400-e29b-41d4-a716-446655440000 "),
    "550e8400-e29b-41d4-a716-446655440000"
  );
});

test("withPersistedChapterSession removes cleared chapter mappings", () => {
  assert.deepEqual(
    withPersistedChapterSession(
      {
        12: "550e8400-e29b-41d4-a716-446655440000",
        15: "d9428888-122b-11e1-b85c-61cd3cbb3210",
      },
      12,
      ""
    ),
    {
      15: "d9428888-122b-11e1-b85c-61cd3cbb3210",
    }
  );
});

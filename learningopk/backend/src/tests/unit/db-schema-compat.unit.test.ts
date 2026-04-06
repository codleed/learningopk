import assert from "node:assert/strict";
import test from "node:test";

import { isMissingOptionalDbFeatureError, withOptionalDbFallback } from "../../lib/db-schema-compat.js";

test("isMissingOptionalDbFeatureError detects missing table code", () => {
  assert.equal(isMissingOptionalDbFeatureError({ code: "42P01" }), true);
});

test("isMissingOptionalDbFeatureError detects missing column code through cause", () => {
  assert.equal(isMissingOptionalDbFeatureError({ cause: { code: "42703" } }), true);
});

test("isMissingOptionalDbFeatureError ignores non-schema errors", () => {
  assert.equal(isMissingOptionalDbFeatureError({ code: "23505" }), false);
  assert.equal(isMissingOptionalDbFeatureError(new Error("boom")), false);
});

test("withOptionalDbFallback returns fallback for optional schema errors", async () => {
  const value = await withOptionalDbFallback(
    "test-feature",
    async () => {
      throw { code: "42P01" };
    },
    () => "fallback"
  );

  assert.equal(value, "fallback");
});

test("withOptionalDbFallback rethrows non-schema errors", async () => {
  await assert.rejects(
    () =>
      withOptionalDbFallback(
        "test-feature",
        async () => {
          throw new Error("unexpected");
        },
        () => "fallback"
      ),
    /unexpected/
  );
});

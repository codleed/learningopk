import assert from "node:assert/strict";
import test from "node:test";

import { formulaIdParamSchema, formulasQuerySchema } from "../../routes/formulas.js";

test("formulasQuerySchema accepts valid search and filter params", () => {
  const parsed = formulasQuerySchema.safeParse({
    q: "quadratic formula",
    subjectId: "12",
    chapterId: "44",
    tag: "algebra"
  });

  assert.equal(parsed.success, true);
});

test("formulasQuerySchema rejects invalid numeric filters", () => {
  const parsed = formulasQuerySchema.safeParse({
    subjectId: "zero"
  });

  assert.equal(parsed.success, false);
});

test("formulaIdParamSchema coerces valid route ids", () => {
  const parsed = formulaIdParamSchema.safeParse({ formulaId: "9" });

  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.formulaId, 9);
  }
});

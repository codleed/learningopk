import assert from "node:assert/strict";
import test from "node:test";

import {
  curriculumExerciseCreateBodySchema,
  curriculumExerciseUpdateBodySchema,
} from "../../routes/admin/index.js";

// curriculumExerciseCreateBodySchema tests

test("curriculumExerciseCreateBodySchema accepts valid non-numerical exercise without new fields", () => {
  const payload = {
    chapterId: 1,
    exerciseNumber: "1",
    question: "What is 2+2?",
    solution: "4",
    difficulty: "medium",
    type: "short",
  };

  const parsed = curriculumExerciseCreateBodySchema.safeParse(payload);
  assert.equal(parsed.success, true);
});

test("curriculumExerciseCreateBodySchema accepts valid numerical exercise with problemMarkdown and solutionCode", () => {
  const payload = {
    chapterId: 1,
    exerciseNumber: "1",
    question: "Projectile motion problem",
    solution: "The answer is...",
    difficulty: "hard",
    type: "numerical",
    problemMarkdown: "# Problem\nCalculate the trajectory...",
    solutionCode: "<canvas id='sim'></canvas><script>// physics simulation</script>",
  };

  const parsed = curriculumExerciseCreateBodySchema.safeParse(payload);
  assert.equal(parsed.success, true);
});

test("curriculumExerciseCreateBodySchema rejects numerical exercise without problemMarkdown", () => {
  const payload = {
    chapterId: 1,
    exerciseNumber: "1",
    question: "Projectile motion problem",
    solution: "The answer is...",
    difficulty: "hard",
    type: "numerical",
    solutionCode: "<canvas id='sim'></canvas><script>// physics simulation</script>",
  };

  const parsed = curriculumExerciseCreateBodySchema.safeParse(payload);
  assert.equal(parsed.success, false);
  if (parsed.success === false) {
    const issue = parsed.error.issues.find(
      (i) => i.path.includes("problemMarkdown") && i.message.includes("numerical")
    );
    assert.ok(issue, "Expected error about problemMarkdown being required for numerical type");
  }
});

test("curriculumExerciseCreateBodySchema rejects numerical exercise without solutionCode", () => {
  const payload = {
    chapterId: 1,
    exerciseNumber: "1",
    question: "Projectile motion problem",
    solution: "The answer is...",
    difficulty: "hard",
    type: "numerical",
    problemMarkdown: "# Problem\nCalculate the trajectory...",
  };

  const parsed = curriculumExerciseCreateBodySchema.safeParse(payload);
  assert.equal(parsed.success, false);
  if (parsed.success === false) {
    const issue = parsed.error.issues.find(
      (i) => i.path.includes("solutionCode") && i.message.includes("numerical")
    );
    assert.ok(issue, "Expected error about solutionCode being required for numerical type");
  }
});

test("curriculumExerciseCreateBodySchema rejects numerical exercise with empty problemMarkdown", () => {
  const payload = {
    chapterId: 1,
    exerciseNumber: "1",
    question: "Projectile motion problem",
    solution: "The answer is...",
    difficulty: "hard",
    type: "numerical",
    problemMarkdown: "   ",
    solutionCode: "<canvas id='sim'></canvas>",
  };

  const parsed = curriculumExerciseCreateBodySchema.safeParse(payload);
  assert.equal(parsed.success, false);
});

test("curriculumExerciseCreateBodySchema rejects numerical exercise with empty solutionCode", () => {
  const payload = {
    chapterId: 1,
    exerciseNumber: "1",
    question: "Projectile motion problem",
    solution: "The answer is...",
    difficulty: "hard",
    type: "numerical",
    problemMarkdown: "# Problem",
    solutionCode: "   ",
  };

  const parsed = curriculumExerciseCreateBodySchema.safeParse(payload);
  assert.equal(parsed.success, false);
});

// curriculumExerciseUpdateBodySchema tests

test("curriculumExerciseUpdateBodySchema accepts valid non-numerical exercise update", () => {
  const payload = {
    exerciseNumber: "1",
    question: "Updated question",
    solution: "Updated solution",
    difficulty: "easy",
    type: "mcq",
  };

  const parsed = curriculumExerciseUpdateBodySchema.safeParse(payload);
  assert.equal(parsed.success, true);
});

test("curriculumExerciseUpdateBodySchema accepts valid numerical exercise update with both fields", () => {
  const payload = {
    exerciseNumber: "1",
    question: "Updated projectile problem",
    solution: "Updated explanation",
    difficulty: "hard",
    type: "numerical",
    problemMarkdown: "# Updated Problem",
    solutionCode: "<canvas id='updated'></canvas>",
  };

  const parsed = curriculumExerciseUpdateBodySchema.safeParse(payload);
  assert.equal(parsed.success, true);
});

test("curriculumExerciseUpdateBodySchema rejects numerical update without problemMarkdown", () => {
  const payload = {
    exerciseNumber: "1",
    question: "Updated projectile problem",
    solution: "Updated explanation",
    difficulty: "hard",
    type: "numerical",
    solutionCode: "<canvas id='updated'></canvas>",
  };

  const parsed = curriculumExerciseUpdateBodySchema.safeParse(payload);
  assert.equal(parsed.success, false);
  if (parsed.success === false) {
    const issue = parsed.error.issues.find(
      (i) => i.path.includes("problemMarkdown") && i.message.includes("numerical")
    );
    assert.ok(issue, "Expected error about problemMarkdown being required for numerical type");
  }
});

test("curriculumExerciseUpdateBodySchema rejects numerical update without solutionCode", () => {
  const payload = {
    exerciseNumber: "1",
    question: "Updated projectile problem",
    solution: "Updated explanation",
    difficulty: "hard",
    type: "numerical",
    problemMarkdown: "# Updated Problem",
  };

  const parsed = curriculumExerciseUpdateBodySchema.safeParse(payload);
  assert.equal(parsed.success, false);
  if (parsed.success === false) {
    const issue = parsed.error.issues.find(
      (i) => i.path.includes("solutionCode") && i.message.includes("numerical")
    );
    assert.ok(issue, "Expected error about solutionCode being required for numerical type");
  }
});

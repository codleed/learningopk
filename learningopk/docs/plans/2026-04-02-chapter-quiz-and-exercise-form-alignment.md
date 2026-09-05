# Chapter Quiz and Exercise Form Alignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ensure chapter challenge always shows the correct chapter quiz and make both admin exercise entry points use the same type-specific field behavior with markdown question/solution support.

**Architecture:** Keep the existing API and component structure, apply a targeted backend query fix for chapter quiz selection, then align frontend form logic in both admin flows using type-aware field rendering and validation. Validate with focused integration and UI-level behavior checks rather than a broad refactor.

**Tech Stack:** Express, Drizzle ORM, PostgreSQL, Next.js, React, TypeScript, Zod, Node test runner, Supertest

---

### Task 1: Add Failing Integration Test for Chapter Quiz Selection

**Files:**

- Create: `backend/src/tests/integration/learn-chapter-quiz-selection.integration.test.ts`
- Reuse patterns from: `backend/src/tests/integration/curriculum-class-slug.integration.test.ts`, `backend/src/tests/integration/learn-subject-graph.integration.test.ts`

**Step 1: Write the failing test**

```ts
test("learn chapter detail returns chapter_quiz when chapter has both quiz types", async () => {
  const app = createApp();
  const fixture = await createLearnFixture();

  await db.insert(quizzes).values([
    {
      chapterId: fixture.chapter.id,
      title: "Mock Exam Should Not Be Used",
      durationMinutes: 90,
      totalMarks: 10,
      type: "mock_exam",
    },
    {
      chapterId: fixture.chapter.id,
      title: "Chapter Quiz Expected",
      durationMinutes: 30,
      totalMarks: 10,
      type: "chapter_quiz",
    },
  ]);

  const response = await request(app).get(
    `/api/learn/${fixture.board.slug}/${fixture.boardClass.slug}/${fixture.subject.slug}/${fixture.chapter.slug}`
  );

  assert.equal(response.status, 200);
  assert.equal(response.body?.quiz?.type, "chapter_quiz");
  assert.equal(response.body?.quiz?.title, "Chapter Quiz Expected");
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test backend/src/tests/integration/learn-chapter-quiz-selection.integration.test.ts`

Expected: FAIL because current repository query can return first quiz without `type` filter.

**Step 3: Commit (test-only checkpoint)**

```bash
git add backend/src/tests/integration/learn-chapter-quiz-selection.integration.test.ts
git commit -m "test: reproduce chapter challenge quiz selection bug"
```

---

### Task 2: Fix Learn Repository Query to Select Only Chapter Quiz

**Files:**

- Modify: `backend/src/repositories/learn.repository.ts`

**Step 1: Implement minimal fix**

```ts
const quizzesData = await db
  .select({
    id: quizzes.id,
    chapterId: quizzes.chapterId,
    title: quizzes.title,
    durationMinutes: quizzes.durationMinutes,
    totalMarks: quizzes.totalMarks,
    type: quizzes.type,
  })
  .from(quizzes)
  .where(and(eq(quizzes.chapterId, chapterId), eq(quizzes.type, "chapter_quiz")))
  .orderBy(asc(quizzes.id))
  .limit(1);
```

**Step 2: Run failing test again**

Run: `pnpm test backend/src/tests/integration/learn-chapter-quiz-selection.integration.test.ts`

Expected: PASS.

**Step 3: Run related learn integration tests**

Run: `pnpm test backend/src/tests/integration/curriculum-class-slug.integration.test.ts backend/src/tests/integration/learn-subject-graph.integration.test.ts`

Expected: PASS.

**Step 4: Commit**

```bash
git add backend/src/repositories/learn.repository.ts
git commit -m "fix: return chapter quiz consistently in learn chapter detail"
```

---

### Task 3: Align Chapter Manage Exercise Form by Type

**Files:**

- Modify: `frontend/src/components/admin/chapter-exercise-manager.tsx`

**Step 1: Write/adjust component behavior tests if present**

If a frontend test harness exists for this component, add tests for type-specific visibility:

- `short/long` show markdown question + markdown solution only
- `fill_in_blanks` shows blanks editor + markdown solution
- `numerical` shows markdown question + markdown solution + visualization editor

If no harness exists, add a manual verification checklist to PR notes for this task.

**Step 2: Replace unconditional question/solution block with type-aware fields**

Implementation outline:

- Keep `question` and `solution` in state for all types.
- For `fill_in_blanks`, route question editing through `FillInBlanksEditor`, keep solution markdown editor visible.
- For `numerical`, keep markdown question/solution plus `NumericalVisualizationEditor`.
- For `short/long`, show markdown editors only.

**Step 3: Make validation type-aware in `handleSave`**

```ts
if (!formData.exerciseNumber.trim()) {
  // error
}
if (!formData.question.trim()) {
  // error
}
if (!formData.solution.trim()) {
  // error
}
if (formData.type === "fill_in_blanks" && formData.blanksAnswer.length === 0) {
  // error
}
```

**Step 4: Verify payload mapping remains correct**

Ensure create/update calls continue sending:

- `blanksAnswer` only for `fill_in_blanks`
- `visualizationHtml` for `numerical`
- existing required fields for all types

**Step 5: Frontend verification**

Run: `pnpm --filter frontend typecheck`

Expected: PASS.

**Step 6: Commit**

```bash
git add frontend/src/components/admin/chapter-exercise-manager.tsx
git commit -m "feat: enforce type-specific exercise fields in chapter manage"
```

---

### Task 4: Align Global Admin Add Exercise Form

**Files:**

- Modify: `frontend/app/admin/content/exercises/add/add-exercise-form.tsx`

**Step 1: Write failing UI test (if harness exists) or define manual checks**

Required behavior:

- Include `fill_in_blanks` in type options
- Type-specific fields match chapter manage behavior

**Step 2: Add missing type option and field logic**

Minimum changes:

- Add `<option value="fill_in_blanks">Fill in the Blanks</option>`
- Add blanks answers state
- Add numerical visualization state
- Render type-specific editors

**Step 3: Update submit payload typing**

```ts
await createAdminCurriculumExercise({
  chapterId: parseInt(chapterId, 10),
  exerciseNumber: exerciseNumber.trim(),
  question: question.trim(),
  solution: solution.trim(),
  difficulty: difficulty as "easy" | "medium" | "hard",
  type: type as "mcq" | "short" | "long" | "numerical" | "fill_in_blanks",
  visualizationHtml: type === "numerical" ? visualizationHtml : undefined,
  blanksAnswer: type === "fill_in_blanks" ? blanksAnswer : undefined,
});
```

**Step 4: Verify**

Run: `pnpm --filter frontend typecheck`

Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/app/admin/content/exercises/add/add-exercise-form.tsx
git commit -m "feat: add type-aware fields to admin add exercise form"
```

---

### Task 5: Align Global Admin Edit Exercise Form

**Files:**

- Modify: `frontend/app/admin/content/exercises/[id]/edit/edit-exercise-form.tsx`

**Step 1: Write failing UI test (if harness exists) or define manual checks**

Required behavior:

- Existing exercise data preloads correctly by type
- Type switch updates visible fields without data corruption

**Step 2: Add missing `fill_in_blanks` and type-specific field groups**

Mirror add-form logic with proper initial state hydration from `exercise`.

**Step 3: Update update payload typing**

```ts
await updateAdminCurriculumExercise({
  exerciseId: exercise.id,
  exerciseNumber: exerciseNumber.trim(),
  question: question.trim(),
  solution: solution.trim(),
  difficulty: difficulty as "easy" | "medium" | "hard",
  type: type as "mcq" | "short" | "long" | "numerical" | "fill_in_blanks",
  visualizationHtml: type === "numerical" ? visualizationHtml : undefined,
  blanksAnswer: type === "fill_in_blanks" ? blanksAnswer : undefined,
});
```

**Step 4: Verify**

Run: `pnpm --filter frontend typecheck`

Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/app/admin/content/exercises/[id]/edit/edit-exercise-form.tsx
git commit -m "feat: add type-aware fields to admin edit exercise form"
```

---

### Task 6: Ensure Markdown Rendering Consistency in Student Exercise View

**Files:**

- Verify (modify only if needed): `frontend/src/components/learn/quest-exercises-view.tsx`

**Step 1: Confirm rendering path**

Ensure both question and solution use `ContentRenderer` for markdown.

**Step 2: Add/adjust minimal code only if gaps exist**

Keep current `enableMath` behavior and preserve numerical/fill-in interactive blocks.

**Step 3: Verify build safety**

Run: `pnpm --filter frontend typecheck`

Expected: PASS.

**Step 4: Commit (if file changed)**

```bash
git add frontend/src/components/learn/quest-exercises-view.tsx
git commit -m "fix: keep student exercise content consistently markdown-rendered"
```

---

### Task 7: End-to-End Verification and Final Integration Check

**Files:**

- Verify changed files from Tasks 1-6

**Step 1: Backend tests**

Run: `pnpm --filter backend test backend/src/tests/integration/learn-chapter-quiz-selection.integration.test.ts`

Expected: PASS.

**Step 2: Frontend typecheck**

Run: `pnpm --filter frontend typecheck`

Expected: PASS.

**Step 3: Manual verification checklist**

1. In chapter manage, create chapter quiz and verify student chapter challenge shows it.
2. In chapter manage, create `short`, `long`, `fill_in_blanks`, `numerical` exercises.
3. In global admin content add/edit, create/edit same four types.
4. Confirm type-specific fields appear correctly for each type.
5. Confirm student question/solution markdown renders correctly.

**Step 4: Final commit**

```bash
git add backend/src/tests/integration/learn-chapter-quiz-selection.integration.test.ts backend/src/repositories/learn.repository.ts frontend/src/components/admin/chapter-exercise-manager.tsx frontend/app/admin/content/exercises/add/add-exercise-form.tsx frontend/app/admin/content/exercises/[id]/edit/edit-exercise-form.tsx frontend/src/components/learn/quest-exercises-view.tsx
git commit -m "fix: align chapter quiz selection and exercise type-specific authoring"
```

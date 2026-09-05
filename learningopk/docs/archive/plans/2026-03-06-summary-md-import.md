# Summary Markdown Import Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add explicit Markdown import options to both chapter summary entry points so admins can import a `.md` file into the add form or edit editor for review before manually submitting or saving.

**Architecture:** Keep the feature fully inside `admin-curriculum-builder.tsx`. Reuse the existing add-form summary state and edit-mode editor state, add lightweight client-side Markdown file import paths with confirmation before replacing local draft content, and cover both flows with focused Playwright regression tests.

**Tech Stack:** Next.js, React 19, TypeScript, Playwright end-to-end tests, existing toast/CodeMirror admin UI components.

---

### Task 1: Add the failing add-form import workflow test

**Files:**

- Modify: `frontend/tests/e2e/admin-phase8-curriculum-builder.spec.ts`
- Test: `frontend/tests/e2e/admin-phase8-curriculum-builder.spec.ts`

**Step 1: Write the failing test**

Add a new Playwright test beside the existing chapter add-form coverage that:

- creates a board, class, and subject
- opens the chapter add form
- verifies the add-form `Upload .md file` control is visible
- types a draft into the summary textarea
- triggers a `.md` import, dismisses the confirmation dialog, and verifies the textarea content is unchanged
- triggers the import again, accepts the confirmation dialog, and verifies the textarea content is replaced with the file contents
- verifies the imported content appears in the add-form preview
- submits the chapter and verifies the imported markdown persisted to the created chapter summary

Use Playwright file upload with an in-memory file:

```ts
await page.getByTestId("curriculum-chapter-markdown-input").setInputFiles({
  name: "chapter-add-summary.md",
  mimeType: "text/markdown",
  buffer: Buffer.from("# Imported heading\n\nImported body."),
});
```

Handle the overwrite confirmation with dialog listeners:

```ts
page.once("dialog", async (dialog) => {
  expect(dialog.message()).toContain("replace");
  await dialog.dismiss();
});
```

**Step 2: Run the test to verify it fails**

Run:

```bash
pnpm.cmd exec playwright test --grep "admin add chapter imports markdown file"
```

Expected: FAIL because the add-form Markdown import control and replacement behavior do not exist yet.

**Step 3: Commit the failing test**

```bash
git add frontend/tests/e2e/admin-phase8-curriculum-builder.spec.ts
git commit -m "test: cover add chapter markdown import workflow"
```

### Task 2: Implement client-side Markdown import in the add form

**Files:**

- Modify: `frontend/components/admin/admin-curriculum-builder.tsx`

**Step 1: Add minimal add-form state and refs for import tracking**

Introduce the smallest state required to support the new behavior:

- a dedicated ref for the add-form Markdown file input
- a shared helper or small add-form-specific handler that reads file text and updates `chapterSummary`
- confirmation only when `chapterSummary.trim().length > 0`

Example shape:

```ts
const chapterMarkdownInputRef = useRef<HTMLInputElement | null>(null);
```

**Step 2: Add the add-form import controls**

Render a visible `Upload .md file` control in the add form near the summary textarea and preview toggle. The add form already supports direct paste/editing through the textarea, so no separate add-form `Paste markdown` button is needed.

Use stable test ids:

```tsx
data-testid="curriculum-chapter-markdown-option"
data-testid="curriculum-chapter-markdown-input"
```

**Step 3: Implement the add-form import handler**

Add a handler that:

- reads the selected file via `await file.text()`
- rejects empty files with an error toast
- checks whether `chapterSummary.trim().length > 0`
- shows `window.confirm(...)` if typed add-form content would be replaced
- replaces the textarea content with `setChapterSummary(nextMarkdown)` when confirmed
- clears the file input afterward so the same file can be reselected
- does not auto-submit the chapter form

Minimal handler shape:

```ts
const importChapterMarkdown = async () => {
  const file = chapterMarkdownInputRef.current?.files?.[0];
  if (!file) {
    pushToast({ title: "Choose a Markdown file first", tone: "error" });
    return;
  }

  const nextMarkdown = (await file.text()).trimEnd();
  if (nextMarkdown.length === 0) {
    pushToast({ title: "Markdown file is empty", tone: "error" });
    return;
  }

  const hasTypedDraft = chapterSummary.trim().length > 0;
  if (
    hasTypedDraft &&
    !window.confirm(
      "Importing a Markdown file will replace the current chapter summary draft. Continue?"
    )
  ) {
    chapterMarkdownInputRef.current.value = "";
    return;
  }

  setChapterSummary(nextMarkdown);
  chapterMarkdownInputRef.current.value = "";
};
```

**Step 4: Run the focused test**

Run:

```bash
pnpm.cmd exec playwright test --grep "admin add chapter imports markdown file"
```

Expected: PASS.

**Step 5: Commit the implementation**

```bash
git add frontend/components/admin/admin-curriculum-builder.tsx
git commit -m "feat: add add-form markdown import option"
```

### Task 3: Keep edit-mode import coverage green

**Files:**

- Verify: `frontend/tests/e2e/admin-phase8-curriculum-builder.spec.ts`
- Verify: `frontend/components/admin/admin-curriculum-builder.tsx`

**Step 1: Run the existing edit-mode import test**

Run:

```bash
pnpm.cmd exec playwright test --grep "admin summary editor imports markdown file for review before save"
```

Expected: PASS to confirm the add-form changes did not break the existing editor import behavior.

**Step 2: Commit if any selector cleanup was required**

```bash
git add frontend/tests/e2e/admin-phase8-curriculum-builder.spec.ts frontend/components/admin/admin-curriculum-builder.tsx
git commit -m "test: keep summary editor markdown import green"
```

### Task 4: Run regression verification

**Files:**

- Modify: `frontend/tests/e2e/admin-phase8-curriculum-builder.spec.ts` if any selector cleanup is needed
- Verify: `frontend/components/admin/admin-curriculum-builder.tsx`

**Step 1: Run targeted regression tests**

Run:

```bash
pnpm.cmd exec playwright test tests/e2e/admin-phase8-curriculum-builder.spec.ts
pnpm.cmd exec playwright test tests/e2e/admin-summary-editor-codemirror.spec.ts
```

Expected: PASS for the new add-form import test, existing edit-mode import coverage, and summary editor smoke coverage.

**Step 2: Run typecheck**

Run:

```bash
pnpm.cmd typecheck
```

Expected: PASS with no TypeScript errors introduced by the new state, refs, or handlers.

**Step 3: Commit final verification state**

```bash
git add frontend/components/admin/admin-curriculum-builder.tsx frontend/tests/e2e/admin-phase8-curriculum-builder.spec.ts
git commit -m "test: verify summary markdown import regressions"
```

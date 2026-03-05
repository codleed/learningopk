# Summary Markdown Import Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add two explicit summary input options in the admin chapter summary editor so admins can either paste markdown directly or import a `.md` file into the editor for review before manually saving.

**Architecture:** Keep the feature fully inside the existing summary editor in `admin-curriculum-builder.tsx`. Reuse the current editor state and save flow, add a client-side Markdown file import path with unsaved-change confirmation, and cover it with focused Playwright regression tests.

**Tech Stack:** Next.js, React 19, TypeScript, Playwright end-to-end tests, existing toast/CodeMirror admin UI components.

---

### Task 1: Add the failing import workflow test

**Files:**
- Modify: `frontend/tests/e2e/admin-phase8-curriculum-builder.spec.ts`
- Test: `frontend/tests/e2e/admin-phase8-curriculum-builder.spec.ts`

**Step 1: Write the failing test**

Add a new Playwright test beside the existing summary editor save coverage that:

- creates a board, class, subject, and chapter
- opens the chapter in the summary editor
- verifies `Paste markdown` and `Upload .md file` controls are visible
- edits the summary so the editor has unsaved changes
- triggers a `.md` import, dismisses the confirmation dialog, and verifies the editor content is unchanged
- triggers the import again, accepts the confirmation dialog, and verifies the editor content is replaced with the file contents
- verifies the imported content appears in the preview
- reloads the summary from the backend or student page before saving and confirms the old summary is still persisted
- clicks `Save summary`, then verifies the imported markdown is persisted

Use Playwright file upload with an in-memory file:

```ts
await page.getByTestId("curriculum-summary-editor-markdown-input").setInputFiles({
  name: "chapter-summary.md",
  mimeType: "text/markdown",
  buffer: Buffer.from("# Imported heading\n\nImported body.")
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
pnpm.cmd --filter frontend test:e2e -- --grep "admin summary editor imports markdown file"
```

Expected: FAIL because the new UI controls and import behavior do not exist yet.

**Step 3: Commit the failing test**

```bash
git add frontend/tests/e2e/admin-phase8-curriculum-builder.spec.ts
git commit -m "test: cover summary markdown import workflow"
```

### Task 2: Implement client-side Markdown import in the summary editor

**Files:**
- Modify: `frontend/components/admin/admin-curriculum-builder.tsx`

**Step 1: Add minimal state and refs for import tracking**

Introduce the smallest state required to support the new behavior:

- `summaryEditorImportMode` or equivalent for the visible two-option control
- a dedicated ref for the Markdown file input
- a baseline value ref such as `summaryEditorPersistedContentRef` to compare current editor content against the last loaded or saved summary

Example shape:

```ts
const [summaryEditorImportMode, setSummaryEditorImportMode] = useState<"paste" | "file">("paste");
const summaryEditorMarkdownInputRef = useRef<HTMLInputElement | null>(null);
const summaryEditorPersistedContentRef = useRef("");
```

Update the chapter load and save paths so the persisted-content ref tracks the last backend-backed summary value.

**Step 2: Add the failing implementation surface**

Render two explicit option controls near the summary editor:

- `Paste markdown`
- `Upload .md file`

Keep `Paste markdown` mapped to the existing editor workflow. For `Upload .md file`, render a file input restricted to Markdown files and a button or direct picker flow that calls a new import handler.

Use stable test ids:

```tsx
data-testid="curriculum-summary-editor-paste-option"
data-testid="curriculum-summary-editor-markdown-option"
data-testid="curriculum-summary-editor-markdown-input"
```

**Step 3: Implement the import handler**

Add a handler that:

- reads the selected file via `await file.text()`
- rejects empty files with an error toast
- compares `summaryEditorLiveContentRef.current` to `summaryEditorPersistedContentRef.current`
- shows `window.confirm(...)` if unsaved edits would be replaced
- replaces the editor content with `setSummaryEditorContentImmediate(nextMarkdown)` when confirmed
- clears the file input afterward so the same file can be reselected
- does not call the save API

Minimal handler shape:

```ts
const importSummaryMarkdown = async () => {
  const file = summaryEditorMarkdownInputRef.current?.files?.[0];
  if (!file) {
    pushToast({ title: "Choose a Markdown file first", tone: "error" });
    return;
  }

  const nextMarkdown = (await file.text()).trimEnd();
  if (nextMarkdown.length === 0) {
    pushToast({ title: "Markdown file is empty", tone: "error" });
    return;
  }

  const hasUnsavedChanges = summaryEditorLiveContentRef.current !== summaryEditorPersistedContentRef.current;
  if (hasUnsavedChanges && !window.confirm("Importing a Markdown file will replace unsaved summary edits. Continue?")) {
    summaryEditorMarkdownInputRef.current.value = "";
    return;
  }

  setSummaryEditorContentImmediate(nextMarkdown);
  summaryEditorMarkdownInputRef.current.value = "";
};
```

**Step 4: Run the focused test**

Run:

```bash
pnpm.cmd --filter frontend test:e2e -- --grep "admin summary editor imports markdown file"
```

Expected: PASS.

**Step 5: Commit the implementation**

```bash
git add frontend/components/admin/admin-curriculum-builder.tsx
git commit -m "feat: add summary markdown import option"
```

### Task 3: Run regression verification

**Files:**
- Modify: `frontend/tests/e2e/admin-phase8-curriculum-builder.spec.ts` if any selector cleanup is needed
- Verify: `frontend/components/admin/admin-curriculum-builder.tsx`

**Step 1: Run targeted regression tests**

Run:

```bash
pnpm.cmd --filter frontend test:e2e -- admin-phase8-curriculum-builder.spec.ts
pnpm.cmd --filter frontend test:e2e -- admin-summary-editor-codemirror.spec.ts
```

Expected: PASS for the new import test and existing summary editor coverage.

**Step 2: Run typecheck**

Run:

```bash
pnpm.cmd --filter frontend typecheck
```

Expected: PASS with no TypeScript errors introduced by the new state, refs, or handlers.

**Step 3: Commit final verification state**

```bash
git add frontend/components/admin/admin-curriculum-builder.tsx frontend/tests/e2e/admin-phase8-curriculum-builder.spec.ts
git commit -m "test: verify summary markdown import regressions"
```

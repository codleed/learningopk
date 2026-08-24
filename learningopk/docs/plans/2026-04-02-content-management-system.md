# Content Management & Delivery System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a comprehensive content management and delivery system for educational chapter screens with GitHub-style markdown editor, numerical visualizations, and fill-in-the-blanks exercises.

**Architecture:** Database-first approach (content in PostgreSQL, images in MinIO). New admin markdown editor with Write/Preview tabs and toolbar. Numerical problems get HTML/CSS/JS sandboxed visualizations. New fill-in-the-blanks exercise type.

**Tech Stack:** Next.js 16, React, CodeMirror, TypeScript, Drizzle ORM, PostgreSQL, MinIO, CVA, Tailwind CSS

---

## Task 1: Database Schema Migration

**Files:**

- Modify: `backend/src/lib/db/schema.ts`

**Changes:**

1. Add `fill_in_blanks` to `exerciseTypeEnum`
2. Add `visualizationHtml` text column to `exercises` table
3. Add `blanksAnswer` jsonb column to `exercises` table (for fill-in-blanks answers)

---

## Task 2: Backend Exercise Route Updates

**Files:**

- Modify: `backend/src/routes/` (exercise-related routes)
- Modify: `backend/src/repositories/learn.repository.ts`

**Changes:**

1. Accept `fill_in_blanks` as valid exercise type in validation
2. Accept `visualizationHtml` field in exercise create/update
3. Accept `blanksAnswer` field for fill_in_blanks exercises
4. Return `visualizationHtml` in learn API responses for numerical exercises

---

## Task 3: GitHub-Style Markdown Editor

**Files:**

- Create: `frontend/src/components/admin/github-markdown-editor.tsx`

**Features:**

- Write/Preview tab bar
- Formatting toolbar: Heading, Bold, Italic, Code, Link, Image, Ordered List, Unordered List, Quote
- CodeMirror editor in Write mode
- ContentRenderer preview in Preview mode
- Drag-and-drop / paste image upload (uses existing chapter-media API)
- "Markdown is supported" / "Paste, drop, or click to add files" footer

---

## Task 4: Numerical Visualization Editor

**Files:**

- Create: `frontend/src/components/admin/numerical-visualization-editor.tsx`

**Features:**

- HTML/CSS/JS code editor (CodeMirror with HTML mode)
- Live preview iframe with sandboxing
- Template selector for common physics visualization patterns

---

## Task 5: Fill-in-the-Blanks Editor

**Files:**

- Create: `frontend/src/components/admin/fill-in-blanks-editor.tsx`

**Features:**

- Textarea with `{{blank:answer}}` syntax support
- Preview showing blanks as underlined input fields
- Answer extraction and validation

---

## Task 6: Update Admin Chapter Management

**Files:**

- Modify: `frontend/app/admin/content/chapters/[id]/manage/chapter-manage-client.tsx`

**Changes:**

- Replace CodeMirrorMarkdownEditor with GithubMarkdownEditor
- Pass chapterId for image uploads
- Use full ContentRenderer for preview

---

## Task 7: Update Exercise Manager

**Files:**

- Modify: `frontend/src/components/admin/chapter-exercise-manager.tsx`

**Changes:**

- Add `fill_in_blanks` to type options
- Show visualization editor when type is `numerical`
- Show blanks editor when type is `fill_in_blanks`
- Pass `visualizationHtml` and `blanksAnswer` in save

---

## Task 8: Numerical Visualization Renderer (Student)

**Files:**

- Create: `frontend/src/components/learn/numerical-visualization-renderer.tsx`

**Features:**

- Sandboxed iframe with `srcdoc` attribute
- sandbox="allow-scripts" (no allow-same-origin)
- Responsive sizing
- Loading state

---

## Task 9: Fill-in-Blanks Renderer (Student)

**Files:**

- Create: `frontend/src/components/learn/fill-in-blanks-renderer.tsx`

**Features:**

- Parse `{{blank:answer}}` syntax from question text
- Render inline input fields for blanks
- Check answers on submit
- Show correct/incorrect feedback

---

## Task 10: Update Student Exercise View

**Files:**

- Modify: `frontend/src/components/learn/quest-exercises-view.tsx`

**Changes:**

- Type-specific rendering per exercise type
- Show visualization iframe for numerical exercises
- Show fill-in-blanks interactive UI for that type
- Add `fill_in_blanks` to type filter pills

---

## Task 11: Frontend API Type Updates

**Files:**

- Modify: `frontend/src/lib/learn-api.ts`
- Modify: `frontend/src/lib/admin-api.ts`

**Changes:**

- Add `fill_in_blanks` to exercise type enums
- Add `visualizationHtml` and `blanksAnswer` to exercise schemas

---

## Task 12: TypeScript Verification

Run `pnpm typecheck` in both frontend and backend to verify all changes compile.

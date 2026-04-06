# Study Card Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign chapter cards and subject cards with a modern editorial cover-art treatment while preserving truthful data, accessibility, and current navigation behavior.

**Architecture:** Add one shared visual helper for subject-aware artwork and reuse it across chapter cards, the subject browse grid, and dashboard subject progress cards. Keep existing data models and links intact; only change presentation and small supporting copy.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, Lucide, existing `public/subjects/*.svg`

---

### Task 1: Add shared study-card artwork primitives

**Files:**
- Create: `frontend/src/components/common/study-card-art.tsx`
- Reuse: `frontend/src/components/common/subject-badge.tsx`

**Step 1:** Add a shared subject palette/motif map.

**Step 2:** Add a `StudyCardArt` component with `subject`, `title`, `variant`, and `index` props.

**Step 3:** Render layered gradients, subtle line motifs, and existing subject SVGs for subject cards.

**Step 4:** Support chapter-card mode with chapter-index-based variation.

### Task 2: Redesign chapter cards

**Files:**
- Modify: `frontend/src/components/learn/chapter-card.tsx`

**Step 1:** Replace the row-style chapter card with an editorial tile using `StudyCardArt`.

**Step 2:** Keep truthful metadata only: chapter number, title, publish status, CTA.

**Step 3:** Keep reduced-motion behavior intact.

### Task 3: Redesign subject browse cards

**Files:**
- Modify: `frontend/app/(dashboard)/subjects/page.tsx`

**Step 1:** Replace the small icon header with a large subject cover block.

**Step 2:** Preserve board/class/progress/CTA and current routing.

**Step 3:** Keep existing progress values and accessibility semantics.

### Task 4: Redesign dashboard subject progress cards

**Files:**
- Modify: `frontend/src/components/dashboard/subject-progress-grid.tsx`

**Step 1:** Apply the same card language in a denser dashboard format.

**Step 2:** Preserve truthful copy: chapter coverage percentage only.

### Task 5: Verify

**Files:**
- Verify: `frontend/`

**Step 1:** Run `pnpm exec tsc --noEmit`

**Step 2:** Run `pnpm build`

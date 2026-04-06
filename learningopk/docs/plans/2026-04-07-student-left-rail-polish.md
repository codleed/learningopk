# Student Left Rail Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add softer 12px edges and a subtle hover polish to all student left-rail interactive items without disturbing the frozen icon behavior.

**Architecture:** Reuse the existing left-rail structure and only tune presentation classes for student-mode items. Keep admin styling unchanged and preserve the current anchored icon layout.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4

---

### Task 1: Polish student nav items

**Files:**
- Modify: `frontend/src/components/foundation/left-rail.tsx`

**Step 1:** Keep student nav item corners at `rounded-xl`.

**Step 2:** Add a subtle hover background/shadow treatment for student-mode items.

### Task 2: Polish student utility items

**Files:**
- Modify: `frontend/src/components/foundation/left-rail.tsx`

**Step 1:** Apply the same 12px edge language to theme toggle, sign out, and profile block in student mode.

**Step 2:** Keep hover polish restrained and consistent.

### Task 3: Verify

**Files:**
- Verify: `frontend/`

**Step 1:** Run `pnpm exec tsc --noEmit`

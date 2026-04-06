# Left Rail Static Icons Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Keep left-rail icons fixed in size and horizontal position when the sidebar expands or collapses.

**Architecture:** Preserve the current rail width animation, but make each nav item use a constant icon slot in both states. Only the text label should appear and disappear; the icon container and icon size should remain static.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, Lucide

---

### Task 1: Stabilize nav item icon layout

**Files:**
- Modify: `frontend/src/components/foundation/left-rail.tsx`

**Step 1:** Remove the collapsed/expanded icon-slot layout switch in `NavItem`.

**Step 2:** Keep a fixed icon column width in both states.

**Step 3:** Keep label rendering conditional, but do not let it reposition the icon.

### Task 2: Verify

**Files:**
- Verify: `frontend/`

**Step 1:** Run `pnpm exec tsc --noEmit`

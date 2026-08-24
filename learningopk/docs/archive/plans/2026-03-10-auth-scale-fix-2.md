# Auth Scale Fix 2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce the Bento auth screen sizing further to standard desktop proportions at 100% zoom.

**Architecture:** Tune the sizing classes in the Bento auth shell, field wrapper, login form, and register form. Keep the structure and behavior intact, and verify with a frontend typecheck after resizing.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS v4

---

### Task 1: Reduce auth scale further

**Files:**

- Modify: `learningopk/frontend/components/auth/bento-auth-shell.tsx`
- Modify: `learningopk/frontend/components/auth/bento-auth-field.tsx`
- Modify: `learningopk/frontend/components/auth/login-form.tsx`
- Modify: `learningopk/frontend/components/auth/register-form.tsx`

**Step 1: Write the failing test**

Identify the remaining oversized sizing classes (notably `h-14`, `text-base`, large heading and card spacing) that keep the UI feeling zoomed in.

**Step 2: Run test to verify it fails**

Run: `pnpm.cmd tsc --noEmit`  
Expected: PASS before the change; this is a styling-only update with compile verification.

**Step 3: Write minimal implementation**

Reduce:

- input/button heights to `h-11`
- label/body text to `text-sm`
- heading/subtitle sizing down one step
- card padding and vertical spacing
- icon and badge sizing

**Step 4: Run test to verify it passes**

Run: `pnpm.cmd tsc --noEmit`  
Expected: PASS

**Step 5: Commit**

```bash
git add learningopk/frontend/components/auth/bento-auth-shell.tsx learningopk/frontend/components/auth/bento-auth-field.tsx learningopk/frontend/components/auth/login-form.tsx learningopk/frontend/components/auth/register-form.tsx
git commit -m "style: reduce bento auth scale further"
```

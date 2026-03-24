# Auth Scale Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce the oversized Bento auth screen sizing on `/login` and `/register` while keeping the current design direction and behavior.

**Architecture:** Tune the sizing classes in the Bento auth shell, field wrapper, login form, and register form. Keep the component structure intact and verify with a frontend typecheck after the sizing changes.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS v4

---

### Task 1: Reduce Bento auth scale

**Files:**
- Modify: `learningopk/frontend/components/auth/bento-auth-shell.tsx`
- Modify: `learningopk/frontend/components/auth/bento-auth-field.tsx`
- Modify: `learningopk/frontend/components/auth/login-form.tsx`
- Modify: `learningopk/frontend/components/auth/register-form.tsx`

**Step 1: Write the failing test**

Identify the oversized auth classes currently driving the zoomed-in look, especially `h-18`, large text sizes, large card padding, and large vertical spacing.

**Step 2: Run test to verify it fails**

Run: `pnpm.cmd tsc --noEmit`
Expected: PASS before the change; this is a style-tuning task with compile verification.

**Step 3: Write minimal implementation**

Reduce the auth sizing classes to more typical desktop proportions while preserving layout and accessibility.

**Step 4: Run test to verify it passes**

Run: `pnpm.cmd tsc --noEmit`
Expected: PASS

**Step 5: Commit**

```bash
git add learningopk/frontend/components/auth/bento-auth-shell.tsx learningopk/frontend/components/auth/bento-auth-field.tsx learningopk/frontend/components/auth/login-form.tsx learningopk/frontend/components/auth/register-form.tsx
git commit -m "style: reduce bento auth screen scale"
```

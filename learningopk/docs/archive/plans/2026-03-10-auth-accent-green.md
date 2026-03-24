# Auth Accent Green Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Swap the standalone Bento auth screens from orange accents to lime green while keeping the change local to `/login` and `/register`.

**Architecture:** Update the hardcoded accent color classes in the Bento auth shell plus the login and register form components. Do not touch shared global theme tokens or other app routes. Verify with a frontend typecheck after the color swap.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS v4

---

### Task 1: Update auth-only accent classes

**Files:**
- Modify: `learningopk/frontend/components/auth/bento-auth-shell.tsx`
- Modify: `learningopk/frontend/components/auth/login-form.tsx`
- Modify: `learningopk/frontend/components/auth/register-form.tsx`

**Step 1: Write the failing test**

Identify the orange accent classes currently used by the Bento auth shell and both form components.

**Step 2: Run test to verify it fails**

Run: `pnpm.cmd tsc --noEmit`
Expected: PASS before the change; this task is a styling-only update with verification focused on compile health.

**Step 3: Write minimal implementation**

Replace the auth-only orange accent classes with a consistent lime-green palette for links, buttons, accents, and hover states.

**Step 4: Run test to verify it passes**

Run: `pnpm.cmd tsc --noEmit`
Expected: PASS

**Step 5: Commit**

```bash
git add learningopk/frontend/components/auth/bento-auth-shell.tsx learningopk/frontend/components/auth/login-form.tsx learningopk/frontend/components/auth/register-form.tsx
git commit -m "style: switch bento auth accent to lime green"
```

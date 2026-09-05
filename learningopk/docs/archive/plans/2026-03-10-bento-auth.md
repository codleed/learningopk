# Bento Auth Screens Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the `/login` and `/register` screens with the approved standalone Bento-style auth layout while preserving current authentication behavior and field validation.

**Architecture:** Add a login/register-only auth shell plus small shared Bento auth presentational helpers, then adapt the existing `LoginForm` and `RegisterForm` to render inside that shell without changing their backend interactions. Verify the new structure with focused frontend tests first, then implement the minimal UI changes needed to satisfy those tests.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS v4, Playwright, existing auth client and shared UI primitives

---

### Task 1: Add failing coverage for the new auth page chrome

**Files:**

- Modify: `learningopk/frontend/tests/e2e/phase2-auth-dashboard.spec.ts`
- Modify: `learningopk/frontend/app/(auth)/login/page.tsx`
- Modify: `learningopk/frontend/app/(auth)/register/page.tsx`

**Step 1: Write the failing test**

Add a focused Playwright test that checks:

- `/login` shows the Bento brand text and `Welcome Back`
- `/register` shows `Create your student account`
- Guest auth pages do not render the dashboard left rail

**Step 2: Run test to verify it fails**

Run: `pnpm playwright test tests/e2e/phase2-auth-dashboard.spec.ts --grep "bento auth shell"`  
Expected: FAIL because the current auth pages still use the shared dashboard-style layout and do not contain the new headings/chrome.

**Step 3: Write minimal implementation**

Do not implement the full redesign yet. Only inspect the failure output and confirm the test is targeting the intended new page structure.

**Step 4: Run test to verify it still fails for the right reason**

Run: `pnpm playwright test tests/e2e/phase2-auth-dashboard.spec.ts --grep "bento auth shell"`  
Expected: FAIL with missing auth shell content rather than selector or syntax errors.

**Step 5: Commit**

```bash
git add learningopk/frontend/tests/e2e/phase2-auth-dashboard.spec.ts
git commit -m "test: cover bento auth shell chrome"
```

### Task 2: Build shared Bento auth shell components

**Files:**

- Create: `learningopk/frontend/components/auth/bento-auth-shell.tsx`
- Create: `learningopk/frontend/components/auth/bento-auth-field.tsx`
- Modify: `learningopk/frontend/app/(auth)/login/page.tsx`
- Modify: `learningopk/frontend/app/(auth)/register/page.tsx`

**Step 1: Write the failing test**

Extend coverage to assert the auth card shell elements that both pages should share:

- Header brand link is visible
- Top-right route switch link is visible
- Footer copyright text is visible
- Main auth card is centered and present

**Step 2: Run test to verify it fails**

Run: `pnpm playwright test tests/e2e/phase2-auth-dashboard.spec.ts --grep "bento auth shell"`  
Expected: FAIL because shared Bento auth shell elements do not exist yet.

**Step 3: Write minimal implementation**

Create a shell component that:

- Accepts page title/subtitle content and card children
- Renders the warm background, brand row, card wrapper, and footer
- Allows login and register to pass different right-side header links and card content

Update both route pages to use the new shell.

**Step 4: Run test to verify it passes**

Run: `pnpm playwright test tests/e2e/phase2-auth-dashboard.spec.ts --grep "bento auth shell"`  
Expected: PASS

**Step 5: Commit**

```bash
git add learningopk/frontend/components/auth/bento-auth-shell.tsx learningopk/frontend/components/auth/bento-auth-field.tsx learningopk/frontend/app/(auth)/login/page.tsx learningopk/frontend/app/(auth)/register/page.tsx learningopk/frontend/tests/e2e/phase2-auth-dashboard.spec.ts
git commit -m "feat: add bento auth shell"
```

### Task 3: Restyle the login form inside the new shell

**Files:**

- Modify: `learningopk/frontend/components/auth/login-form.tsx`
- Modify: `learningopk/frontend/app/(auth)/login/page.tsx`

**Step 1: Write the failing test**

Add or extend coverage to assert login-specific UI elements:

- Email and password labels still exist
- Forgot-password link is visible
- Remember-me control is visible
- Primary CTA uses `Log In`
- Create-account prompt is visible

**Step 2: Run test to verify it fails**

Run: `pnpm playwright test tests/e2e/phase2-auth-dashboard.spec.ts --grep "login bento form"`  
Expected: FAIL because the current login form layout does not match the new composition.

**Step 3: Write minimal implementation**

Update `LoginForm` to:

- Render login-specific Bento field wrappers
- Add leading icons and password visibility toggle
- Add remember-me row and footer prompt
- Preserve validation, submit flow, and error states

**Step 4: Run test to verify it passes**

Run: `pnpm playwright test tests/e2e/phase2-auth-dashboard.spec.ts --grep "login bento form"`  
Expected: PASS

**Step 5: Commit**

```bash
git add learningopk/frontend/components/auth/login-form.tsx learningopk/frontend/app/(auth)/login/page.tsx learningopk/frontend/tests/e2e/phase2-auth-dashboard.spec.ts
git commit -m "feat: redesign login form in bento auth shell"
```

### Task 4: Restyle the register form inside the new shell

**Files:**

- Modify: `learningopk/frontend/components/auth/register-form.tsx`
- Modify: `learningopk/frontend/app/(auth)/register/page.tsx`

**Step 1: Write the failing test**

Add or extend coverage to assert register-specific UI elements:

- `Create your student account` heading is visible
- Existing form fields are still label-accessible
- Terms row is visible
- Sign-in prompt is visible

**Step 2: Run test to verify it fails**

Run: `pnpm playwright test tests/e2e/phase2-auth-dashboard.spec.ts --grep "register bento form"`  
Expected: FAIL because the current register form does not render the approved Bento composition.

**Step 3: Write minimal implementation**

Update `RegisterForm` to:

- Render the existing real field set in the new two-column Bento layout where appropriate
- Preserve `Select` behavior for board and class
- Add the terms row and bottom sign-in prompt
- Preserve validation, async option loading, submit flow, and error states

**Step 4: Run test to verify it passes**

Run: `pnpm playwright test tests/e2e/phase2-auth-dashboard.spec.ts --grep "register bento form"`  
Expected: PASS

**Step 5: Commit**

```bash
git add learningopk/frontend/components/auth/register-form.tsx learningopk/frontend/app/(auth)/register/page.tsx learningopk/frontend/tests/e2e/phase2-auth-dashboard.spec.ts
git commit -m "feat: redesign register form in bento auth shell"
```

### Task 5: Verify the frontend package stays healthy

**Files:**

- Modify: `learningopk/frontend/tests/e2e/phase2-auth-dashboard.spec.ts`
- Modify: `learningopk/frontend/components/auth/login-form.tsx`
- Modify: `learningopk/frontend/components/auth/register-form.tsx`
- Modify: `learningopk/frontend/components/auth/bento-auth-shell.tsx`
- Modify: `learningopk/frontend/app/(auth)/login/page.tsx`
- Modify: `learningopk/frontend/app/(auth)/register/page.tsx`

**Step 1: Write the failing test**

If any accessibility or selector issues surface during implementation, add the smallest focused test that reproduces them before fixing.

**Step 2: Run test to verify it fails**

Run the specific test command for the reproduced issue.  
Expected: FAIL for the targeted regression.

**Step 3: Write minimal implementation**

Fix only the surfaced regression and avoid incidental refactors.

**Step 4: Run test to verify it passes**

Run:

- `pnpm eslint`
- `pnpm tsc --noEmit`
- `pnpm playwright test tests/e2e/phase2-auth-dashboard.spec.ts --grep "bento auth shell|login bento form|register bento form"`

Expected: all commands PASS.

**Step 5: Commit**

```bash
git add learningopk/frontend
git commit -m "test: verify bento auth redesign"
```

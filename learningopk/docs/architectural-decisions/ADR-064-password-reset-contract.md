# ADR-064: Password Reset Contract Resolution

## Status

Accepted (2026-04-05) — Option 2 implemented

## Context

The system exhibited a contract mismatch between frontend and backend regarding password reset functionality:

**Frontend Implementation (at time of investigation):**

- `login-page-client.tsx` had a "Forgot password?" link pointing to `/forgot-password`
- No `/forgot-password` or `/reset-password` page routes existed
- No `forgot-password-form.tsx` or `reset-password-form.tsx` components existed

**Backend Reality:**

- `backend/src/lib/auth.ts` configures Better Auth but **does not enable** `emailAndPassword.sendResetPassword`
- Without this configuration, the `/api/auth/request-password-reset` and `/api/auth/reset-password` endpoints are **not registered**
- Users clicking "Forgot password?" would be navigated to a nonexistent route

**Documentation:**

- `docs/redesign/api-contracts.md` already correctly documents that password reset is not enabled (line 30)

**Test Coverage:**

- `phase3-auth-layout-routes.spec.ts` already asserts that reset-password and forgot-password routes 404
- `auth-resilience.spec.ts` tests login network failure handling (unrelated to password reset)

## Decision

**Option 2 implemented: Disable password reset in the UI.**

Investigation found that the frontend had no `/forgot-password` or `/reset-password` page routes, and no form components for these flows existed. The only artifact was a dangling "Forgot password?" link in `login-page-client.tsx`. The backend does not configure `sendResetPassword`, so the endpoints are not available.

**Changes made (TASK-56):**

1. Removed the "Forgot password?" link from `login-page-client.tsx` with a comment explaining the status and how to re-enable
2. Confirmed no `/forgot-password` or `/reset-password` page routes or form components need removal (they never existed)
3. Confirmed `docs/redesign/api-contracts.md` already documents password reset as not enabled
4. Confirmed `phase3-auth-layout-routes.spec.ts` already asserts these routes 404
5. Updated this ADR status from Proposed to Accepted

**To enable password reset in the future (Option 1):**

Configure Better Auth with `sendResetPassword` function:

```ts
// backend/src/lib/auth.ts
export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url, token }) => {
      // Send email via email worker
      await emailWorker.sendPasswordReset({ user, url, token });
    },
    onPasswordReset: async ({ user }) => {
      // Audit log: password was reset
      await analyticsWorker.trackPasswordReset(user.id);
    },
    resetPasswordTokenExpiresIn: 3600, // 1 hour
    revokeSessionsOnPasswordReset: true,
  },
});
```

Then:

- Create `/forgot-password` and `/reset-password` page routes
- Create form components for both flows
- Re-add "Forgot password?" link to `login-page-client.tsx`
- Update `phase3-auth-layout-routes.spec.ts` to test real endpoints
- Update `docs/redesign/api-contracts.md` to document the endpoints

## Consequences

**Positive:**

- Eliminates the broken "Forgot password?" link that led nowhere
- Frontend and backend contract are now consistent (neither offers password reset)
- No backend work needed
- Reduces attack surface area
- Test suite (`phase3-auth-layout-routes.spec.ts`) already validates that password reset routes 404

**Negative:**

- Users who forget passwords must contact support
- Loss of self-service capability until Option 1 is implemented

**Effort:** Minimal — only one link removal + ADR update + doc confirmation

---

# ADR-065: Auth UI Consolidation and Test Alignment

## Status

Proposed

## Context

The authentication UI layer shows signs of design iteration drift:

**Dead Code Identified:**

- `bento-auth-shell.tsx` - Old Bento-style auth container not used anywhere
- `auth-top-navbar.tsx` - Top navigation for auth pages, not used in current layout
- References to "Remember me" in `login-form.tsx` (line 105-112) but the checkbox is present and functional; however, the API contract doesn't specify `rememberMe` behavior in `api-contracts.md`

**Test-UI Mismatch:**

- `phase3-auth-layout-routes.spec.ts` expects certain text labels and behaviors that may have changed
- No single source of truth for auth UI test selectors
- Tests might be brittle due to string matching

**Layout Inconsistency:**

- Current auth pages use `AuthLayout` with sidebar hero illustration
- `BentoAuthShell` represents a different design direction that was abandoned
- Having both in codebase causes confusion

## Decision

**Phase 1: Remove Dead Auth UI Components**

- Delete `bento-auth-shell.tsx` and any unreferenced Bento components
- Keep only `AuthLayout` as the single auth container

**Phase 2: Consolidate Auth UI Documentation**

- Create a single source of truth for auth screen designs in `frontend/docs/AUTH_UI_SPEC.md`
- Document all form fields, validation rules, and error states
- Reference this spec when updating tests

**Phase 3: Strengthen Test Selectors**

- Add `data-testid` attributes to critical auth form elements
- Update E2E tests to use test IDs instead of text strings where possible
- Ensure tests target behavior, than exact text

**Example:**

```tsx
// login-form.tsx
<input
  id="email"
  data-testid="login-email-input"
  // ... existing props
/>;

// test
await page.getByTestId("login-email-input").fill("test@example.com");
```

## Consequences

**Positive:**

- Cleaner codebase without dead code
- Reduced confusion for future developers
- More maintainable tests less prone to UI text changes
- Clear documentation of auth UI contract

**Negative:**

- Temporary disruption if any tests rely on dead components (need to verify)
- Need to audit all auth-related tests and update selectors

## Verification Steps

1. Search for imports of `bento-auth-shell` and `bento-auth-field`
2. Run all E2E tests to identify which ones fail after removal
3. Update failing tests to use current UI and proper selectors
4. Document final test strategy in `frontend/tests/e2e/README.md`

---

# ADR-066: Forum Filter State Preservation Architecture

## Status

Proposed (Already Implemented - Document Existing Design)

## Context

The forum filter state management needs to preserve user intent across interactions:

**Current Requirements:**

1. Search query should persist when toggling solved/unsolved filters
2. Advanced filters should preserve the search query when applied
3. All filter state should be URL-driven, not isolated component state
4. Filter changes should be bookmarkable and shareable

## Existing Implementation Analysis

**URL-Driven State (Correct):**

- `frontend/app/forum/page.tsx` reads all filters from `searchParams`
- `forumSearchParamsSchema` validates query parameters
- `buildForumHref` constructs URLs with current state

**ForumFilterBar Component:**

- Quick filter links include `selected.q` when present (line 115)
- Advanced filters form uses `method="GET"` preserving all fields
- Search form uses `method="GET"` with `defaultValue={selected.q ?? ""}`

**Identified Gap:**
The "Reset" button in advanced filters (line 209-213) links to `/forum` which clears **all** state including search query. This violates requirement #1.

## Decision

**Fix Reset Button Behavior (TASK-62 Part 3):**

Change the Reset button to preserve the search query while clearing other filters:

```tsx
// forum-filter-bar.tsx line 209
// CURRENT (incorrect):
<Link href="/forum">
  <Button type="button" size="sm" variant="ghost">
    Reset
  </Button>
</Link>

// CORRECT:
<Link href={buildForumHref({ q: selected.q })}>
  <Button type="button" size="sm" variant="ghost">
    Reset
  </Button>
</Link>
```

This requires `buildForumHref` to be passed as a prop or imported. Since it's currently defined in `page.tsx`, we should extract it to a shared utility.

**Extract `buildForumHref` to `@/lib/forum-utils.ts`**:

- Move the function from `page.tsx` to a shared module
- Import it in both `page.tsx` and `forum-filter-bar.tsx`
- This ensures consistent URL construction logic

## Consequences

**Positive:**

- Single source of truth for forum URL construction
- Reset button preserves search intent (only clears filters, not search)
- Consistent behavior across all filter interactions
- Better testability (utility function can be unit tested)

**Negative:**

- Requires moving code from page to shared utility
- Need to update imports in two files
- Minimal risk of breaking changes

## Implementation Steps

1. Create `frontend/src/lib/forum-utils.ts` with `buildForumHref`
2. Update `forum-filter-bar.tsx` to use the shared utility for Reset button
3. Update `page.tsx` to import and use the shared utility
4. Add unit test for `buildForumHref` to ensure correctness
5. Update E2E tests to verify state preservation across filter interactions

---

# Summary of Required Fixes

## TASK-56: Password Reset Contract

- [x] **Decision**: Disable password reset UI (Option 2)
- [x] Removed "Forgot password?" link from `login-page-client.tsx` with explanatory comment
- [x] Confirmed no forgot-password/reset-password pages or form components exist to remove
- [x] Confirmed `docs/redesign/api-contracts.md` already documents password reset as not enabled
- [x] Confirmed `phase3-auth-layout-routes.spec.ts` already asserts these routes 404
- [x] Updated ADR-064 status from Proposed to Accepted

## TASK-57: Auth Review Drift

- [x] Remove `bento-auth-shell.tsx` and any unreferenced Bento components (removed `bento-auth-field.tsx`; `bento-auth-shell.tsx` did not exist)
- [x] Remove `auth-top-navbar.tsx` if truly unused (file did not exist)
- [x] Audit `login-form.tsx` for "Remember me" — removed dead `login-form.tsx` (replaced by `login-page-client.tsx`); "Remember me" Switch removed from `login-page-client.tsx`
- [x] Remove dead `register-form.tsx` (replaced by `register-page-client.tsx`)
- [x] `data-testid` attributes already present on auth forms (login-email-input, login-password-input, login-submit-button)
- [x] Update E2E tests — rewrote "bento auth shell" test to match current auth UI
- [x] `phase3-auth-layout-routes.spec.ts` already correct (asserts forgot-password/reset-password 404, no mocks)
- [x] `auth-resilience.spec.ts` locators verified against current UI (no ambiguity after Switch removal)
- [x] `api-contracts.md` updated: removed false "Remember me" claim, added `autoSignIn` note, clarified password reset status

## TASK-62: Forum Filter State

- [ ] Extract `buildForumHref` to `frontend/src/lib/forum-utils.ts`
- [ ] Update `forum-filter-bar.tsx` Reset button to preserve search query
- [ ] Verify quick filters already preserve search query (line 115 confirms yes)
- [ ] Verify advanced filters preserve search query upon apply (form submission does)
- [ ] Add E2E test cases for combined filter interactions (search + solved toggle + advanced)
- [ ] Update existing E2E tests if brittle

## Cross-Cutting Documentation

- [ ] Update `docs/redesign/api-contracts.md`:
  - Document actual auth endpoints (`/sign-in/email`, `/sign-up/email`, `/request-password-reset`, `/reset-password` if enabled)
  - Document "Remember me" expectation in login response
  - Document forum query parameters comprehensively
  - Remove any stale endpoint references

- [ ] Create `frontend/docs/AUTH_UI_SPEC.md` documenting:
  - All auth pages and their layouts
  - Form fields and validation rules
  - Error state mappings
  - Success state redirects

## Test Coverage Updates

- [ ] `frontend/tests/e2e/auth-resilience.spec.ts`: Test real network failure handling, not mock
- [ ] `frontend/tests/e2e/phase3-auth-layout-routes.spec.ts`: Update to test actual endpoints without mocking if password reset enabled
- [ ] Add `frontend/tests/e2e/forum-filter-state.spec.ts` for TASK-62 coverage
- [ ] Verify all E2E tests pass with current UI (run `pnpm test:e2e`)

# ADR-064: Password Reset Contract Resolution

## Status
Proposed

## Context
The system exhibits a critical contract mismatch between frontend and backend regarding password reset functionality:

**Frontend Implementation:**
- `forgot-password-form.tsx` calls `/api/auth/request-password-reset`
- `reset-password-form.tsx` calls `/api/auth/reset-password`
- Both pages are fully implemented with UI and error handling

**Backend Reality:**
- `backend/src/lib/auth.ts` configures Better Auth but **does not enable** `emailAndPassword.sendResetPassword`
- Without this configuration, the `/api/auth/request-password-reset` and `/api/auth/reset-password` endpoints are **not registered**
- Users clicking "Forgot password?" will encounter 404 errors

**Documentation Gap:**
- `docs/redesign/api-contracts.md` does not document password reset endpoints at all
- No indication whether password reset is supported or intentionally disabled

**Test Coverage:**
- `frontend/tests/e2e/auth-resilience.spec.ts` mocks `/api/auth/sign-in/email` (correct Better Auth endpoint)
- `phase3-auth-layout-routes.spec.ts` tests password reset by mocking the endpoint, indicating it doesn't exist

## Decision

**Option 1 (Recommended): Enable Password Reset End-to-End**

Configure Better Auth with `sendResetPassword` function and document the complete flow:

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
    revokeSessionsOnPasswordReset: true
  }
});
```

**Option 2: Remove Password Reset from UI**

If password reset is not intended for the current phase:
- Remove `/forgot-password` and `/reset-password` pages
- Remove "Forgot password?" link from login form
- Remove dead code (`forgot-password-form.tsx`, `reset-password-form.tsx`)
- Update API contracts to explicitly state password reset is disabled

## Consequences

### Option 1 (Enable)
**Positive:**
- Full password reset functionality available to users
- Consistent contract between frontend and backend
- Reduced support burden (users can self-serve password recovery)

**Negative:**
- Requires email delivery infrastructure (already exists via email worker)
- Need to implement `sendResetPassword` handler
- Must test email integration
- Security considerations: rate limiting, token expiry

**Effort:** ~4 hours (email integration already exists, just need to wire it)

### Option 2 (Remove)
**Positive:**
- Quick fix, no backend work needed
- Eliminates broken user experience (404s)
- Reduces attack surface area

**Negative:**
- Users who forget passwords must contact support
- Loss of self-service capability
- Significant UI changes needed
- Existing test (`phase3-auth-layout-routes.spec.ts`) expects password reset to work, so test must be updated

**Effort:** ~2 hours (removal) + test updates

## Recommendation

**Implement Option 1** - Enable password reset with proper configuration. The infrastructure is already in place (email worker, Better Auth support). The frontend is already built and tested. This provides a complete user experience and aligns with the product requirements.

If Option 1 is chosen, also:
1. Update `docs/redesign/api-contracts.md` to document password reset endpoints
2. Ensure `phase3-auth-layout-routes.spec.ts` tests work without mocking (currently mocks the reset endpoint)
3. Add password reset verification script similar to `verify-auth.ts`

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
/>

// test
await page.getByTestId('login-email-input').fill('test@example.com');
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
- [ ] **Decision**: Enable password reset OR remove UI (RECOMMEND: Enable)
- [ ] If enabled: Add `sendResetPassword` to `backend/src/lib/auth.ts`
- [ ] Update `docs/redesign/api-contracts.md` with password reset endpoints
- [ ] Update `auth-resilience.spec.ts` to test real endpoints (remove mock if password reset enabled)
- [ ] Consider: Remove hardcoded mock in favor of real behavior verification

## TASK-57: Auth Review Drift
- [ ] Remove `bento-auth-shell.tsx` and any unreferenced Bento components
- [ ] Remove `auth-top-navbar.tsx` if truly unused (verify imports first)
- [ ] Audit `login-form.tsx` for "Remember me" - it's present but needs documentation in API contract
- [ ] Add `data-testid` attributes to auth forms
- [ ] Update E2E tests to use test IDs, verify alignment with current UI
- [ ] Update `phase3-auth-layout-routes.spec.ts` to match actual behavior (remove mocks if password reset enabled)

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

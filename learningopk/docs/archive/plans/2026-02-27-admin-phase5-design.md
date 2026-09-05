# Admin Phase 5 Design

## Context

- Admin Phases 1-4 established:
  - admin shell + route completeness
  - moderation and users read workflows
  - community and analytics workflows
  - notifications and settings workflows
- The highest remaining admin gap is user lifecycle management on `/admin/users`.
- Current limitations:
  - users can only be listed/searched/filtered by role
  - no role mutation workflow from admin UI
  - no account suspension lifecycle
  - no user-lifecycle audit trail in admin scopes

## Approach Options

### Option A: Role management only

- Add promote/demote role mutations and keep account status unchanged.
- Pros: lowest schema and behavioral risk.
- Cons: does not address suspension lifecycle.

### Option B (Recommended): Role + suspension lifecycle

- Add role mutation and student suspension/reactivation operations with audit logs and route-level suspension enforcement.
- Pros: complete first lifecycle slice with bounded scope.
- Cons: introduces schema + middleware changes.

### Option C: Full governance suite

- Option B plus bulk actions, session revocation tooling, and history dashboards.
- Pros: maximum governance capabilities.
- Cons: oversized phase and higher regression risk.

## Approved Direction

- Approach: **Option B with students-only suspension**
- Constraints:
  - suspension can target only users currently in role `student`
  - no self role mutation for signed-in admin
- Execution model: backend-first vertical slices under strict TDD.

## Goals

- Extend `/admin/users` with lifecycle controls:
  - promote student to admin
  - demote admin to student
  - suspend student (required reason)
  - reactivate suspended student
- Extend users listing/filtering to include status-aware operations.
- Block suspended users from protected backend routes.
- Persist user lifecycle actions in admin audit logs.
- Preserve all existing admin and student flows from Phases 1-4.

## Non-goals

- No bulk user actions.
- No session revocation dashboard.
- No suspension support for admin-role users.
- No redesign of non-admin routes.
- No new notification, settings, analytics, moderation, or content scope beyond regression-safe integration.

## Data Model

- Add enum `user_status`: `active | suspended`.
- Extend table `user` with:
  - `status` enum `user_status` default `active`
  - `suspended_at` timestamp nullable
  - `suspended_reason` text nullable
  - `suspended_by` nullable FK to `user.id`
- Extend enum `admin_audit_scope` with `users`.
- Seed data updates:
  - keep deterministic user fixtures
  - include at least one suspended student fixture for stable e2e assertions.

## Backend Architecture

### Session Enforcement

- Keep `requireSession` as the central auth gate.
- Extend `requireSession` to load current user status from DB after session validation.
- If user status is `suspended`, reject with `403` and structured payload:
  - `error: "Account suspended"`
  - `code: "ACCOUNT_SUSPENDED"`
- Result: all protected routes already using `requireSession` inherit suspension enforcement.

### Users API Contracts

#### GET `/api/admin/users`

- Query params:
  - `page` (default 1)
  - `pageSize` (default 20, max 100)
  - `q` (optional text search)
  - `role` (`student|admin`, optional)
  - `status` (`active|suspended`, optional)
- Auth:
  - `401` unauthenticated
  - `403` non-admin
- Success payload entry shape extends with:
  - `status`
  - `suspendedAt`
  - `suspendedReason`
  - `suspendedBy` (nullable actor metadata)

#### POST `/api/admin/users/:id/role`

- Body:
  - `role` (`student|admin`)
- Auth:
  - `401` unauthenticated
  - `403` non-admin
- Responses:
  - `400` invalid payload/params
  - `404` target user not found
  - `409` no-op role change or self role mutation
  - `200` updated user summary
- Side effects:
  - persist user role
  - write admin audit log (`scope: users`)

#### POST `/api/admin/users/:id/suspension`

- Body:
  - `action` (`suspend|reactivate`)
  - `reason` required for `suspend`, optional/ignored for `reactivate`
- Auth:
  - `401` unauthenticated
  - `403` non-admin
- Responses:
  - `400` invalid payload/params
  - `404` target user not found
  - `409` invalid transition (already suspended/active), non-student target, or self-target guard
  - `200` updated user summary
- Side effects:
  - update suspension fields
  - write admin audit log (`scope: users`)

## Admin Audit Logging

- Add `users` audit scope.
- Action names:
  - `Promote user role`
  - `Demote user role`
  - `Suspend user`
  - `Reactivate user`
- Log actor identity from authenticated session and concise target/message payload.

## Frontend Architecture

- `frontend/lib/admin-api.ts`
  - extend users schema with status + suspension metadata
  - add typed helpers:
    - `updateAdminUserRole`
    - `updateAdminUserSuspension`
- `/admin/users`
  - keep server prefetch pattern
  - include status filter in initial fetch state
- `AdminUsersPanel`
  - add status filter control
  - add row action handlers for role and suspension mutations
  - reuse toast + refresh pattern from prior phases
- `AdminUsersTable`
  - add status column + suspension metadata display
  - add action buttons with disabled/loading states

## UI Behavior

- Role mutation:
  - action button reflects current role (`Promote`/`Demote`)
  - success: refresh list, success toast
  - failure: error toast, preserve filters and pagination context
- Suspension mutation:
  - `Suspend` opens required-reason prompt/dialog
  - `Reactivate` executes directly with confirmation affordance
  - success: row status and metadata update after refresh
  - failure: clear error toast for invalid transition/guard failure
- Empty state and fetch failure behavior remain consistent with existing admin panels.

## Error and Guardrail Rules

- Prevent self-role mutation.
- Prevent suspension/reactivation for non-student users.
- Require non-trivial suspension reason (trimmed min length).
- Prevent invalid state transitions with explicit `409` responses.
- Preserve last-known UI data on transient fetch/mutation refresh failures.

## Testing Strategy (Strict TDD)

- Backend integration tests (new phase file):
  - users list auth/role/status/query filtering
  - role mutation auth/validation/not-found/conflict/success
  - suspension mutation auth/validation/not-found/conflict/success
  - audit-log assertions for users scope actions
  - suspended-user enforcement on at least one protected non-admin route
- Frontend Playwright tests:
  - admin users role promote/demote flow
  - admin users suspend/reactivate flow with required reason
- Regression targets:
  - keep Phase 1-4 admin specs green
  - keep smoke spec green

## Verification Targets

- `pnpm.cmd --filter backend exec tsx --test src/tests/integration/admin-phase5.integration.test.ts`
- `pnpm.cmd --filter frontend typecheck`
- `pnpm.cmd --filter frontend lint`
- `pnpm.cmd --filter frontend test:e2e:smoke`
- `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase1-shell.spec.ts`
- `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase2-moderation-users.spec.ts`
- `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase3-community-analytics.spec.ts`
- `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase4-notifications-settings.spec.ts`
- `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase5-users-lifecycle.spec.ts`
- `pnpm.cmd --filter backend typecheck`

## Verification Run Rules

- Before each Playwright command, run:
  - `pnpm.cmd --filter backend db:clear`
- Use PowerShell env vars for backend/frontend verification commands when needed:
  - `DATABASE_URL=postgres://postgres:password@localhost:5433/learningo`
  - `REDIS_URL=redis://localhost:6379`
  - `BETTER_AUTH_SECRET=12345678901234567890123456789012`
  - `BETTER_AUTH_URL=http://localhost:3001`
  - `FRONTEND_ORIGIN=http://localhost:3000`

## Risks and Mitigations

- Risk: privilege misuse from lifecycle mutations.
  - Mitigation: strict admin role checks + self-guard + deterministic response codes.
- Risk: suspended users retaining access via active sessions.
  - Mitigation: enforce status in `requireSession` for every protected route.
- Risk: lifecycle changes regress existing admin flows.
  - Mitigation: mandatory Phase 1-4 regression specs in final gate.
- Risk: e2e nondeterminism from mutable state.
  - Mitigation: DB clear before each Playwright run and deterministic fixtures.

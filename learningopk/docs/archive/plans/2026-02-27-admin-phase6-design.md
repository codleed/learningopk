# Admin Phase 6 Design

## Context

- Admin Phases 1-5 established:
  - admin shell and route completeness
  - moderation and users workflows
  - community and analytics workflows
  - notifications and settings workflows
  - user lifecycle controls (role + suspension)
- Audit logs are persisted across admin scopes:
  - `content`, `forum`, `moderation`, `notifications`, `settings`, `users`
- Current audit read surface is incomplete:
  - available in UI/API: `content`, `forum`
  - missing from UI/API: `moderation`, `notifications`, `settings`, `users`
- Highest remaining operational gap: no unified audit center for cross-scope investigation and filtering.

## Approach Options

### Option A: Route-only aggregator

- Add one aggregated route and one new UI page.
- Pros: fastest, low risk.
- Cons: leaves scoped audit route parity incomplete.

### Option B: Scoped parity only

- Add missing scope-specific audit reads to each admin area.
- Pros: consistent APIs by scope.
- Cons: no unified cross-scope audit workflow.

### Option C (Approved): Hybrid

- Add unified audit center (`/admin/audit`) and aggregated API.
- Also add missing scope-specific audit read routes for consistency.
- Pros: immediate centralized operations + coherent API surface.
- Cons: larger than Option A, but still bounded.

## Approved Direction

- Approach: **Option C (Hybrid), backend-first vertical slices with strict TDD**
- Deliver:
  - aggregated audit API with filtering + pagination
  - missing scope-specific audit read endpoints
  - new `/admin/audit` page with filterable, paginated audit table
- Preserve existing content/forum audit behavior.

## Goals

- Provide a unified audit trail for admins across all scopes.
- Allow filtering by:
  - scope
  - status
  - free-text query
  - pagination controls
- Expose all supported scope-specific audit read routes with consistent payloads.
- Keep prior admin workflows and routes stable.

## Non-goals

- No schema migration for `admin_audit_logs`.
- No write-path changes for existing audit emitters.
- No new admin mutation workflows beyond audit read access.
- No redesign of student-facing routes.

## Data Model

- No table or enum changes required.
- Reuse existing `admin_audit_logs` columns:
  - `scope`, `action`, `target`, `status`, `message`, `actor_id`, `actor_name`, `created_at`

## Backend API Contracts

### GET `/api/admin/audit-logs`

- Query params:
  - `scope` (`all|content|forum|moderation|notifications|settings|users`, default `all`)
  - `status` (`all|success|failed`, default `all`)
  - `q` (optional text search over action/target/message/actor name)
  - `page` (default `1`)
  - `pageSize` (default `20`, max `100`)
- Auth:
  - `401` unauthenticated
  - `403` non-admin
  - `400` invalid query params
- Success payload:
  - `entries[]`:
    - `id`, `scope`, `action`, `target`, `status`, `message`
    - `actor: { id, name }`
    - `occurredAt`
  - `total`, `page`, `pageSize`, `hasMore`

### Added scope-specific read routes

- `GET /api/admin/moderation/audit-logs`
- `GET /api/admin/notifications/audit-logs`
- `GET /api/admin/settings/audit-logs`
- `GET /api/admin/users/audit-logs`
- Contracts align with existing `/api/admin/content/audit-logs` and `/api/admin/forum/audit-logs`:
  - query: `page`, `pageSize`
  - response: `entries`, `total`, `page`, `pageSize`, `hasMore`

## Frontend Architecture

- `frontend/lib/admin-api.ts`
  - extend audit schema to include `scope`
  - add `getAdminAuditLogs(...)`
  - add helpers for newly exposed scope-specific audit routes if needed
- New route:
  - `frontend/app/admin/audit/page.tsx`
  - server prefetch initial audit payload (`scope=all`, `status=all`, `q=""`, page 1)
- New components:
  - `frontend/components/admin/admin-audit-panel.tsx`
  - `frontend/components/admin/admin-audit-table.tsx`
- Navigation:
  - add `Audit Trail` item to `frontend/components/admin/admin-nav-config.ts`

## UI Behavior

- Filters:
  - scope select
  - status select
  - text search
  - `Apply filters` resets to page 1
- Controls:
  - `Refresh` reloads page 1 under current filters
  - `Load more` appends rows while `hasMore`
- Table:
  - columns: occurred at, scope, action, target, status, actor
  - row detail affordance to show full `message`
- Errors:
  - toast on fetch failure
  - preserve last known rows on transient failures

## Error and Guardrail Rules

- Validate all query enums and pagination bounds server-side.
- Keep response shape stable across aggregated and scoped endpoints.
- Never expose audit read routes to non-admin users.
- Keep UI resilient to partial failures by preserving current list state.

## Testing Strategy (Strict TDD)

- Backend integration tests (new phase file):
  - aggregated endpoint auth/role enforcement
  - scope filter behavior
  - status filter behavior
  - search query behavior
  - pagination behavior
  - parity checks for newly added scope-specific routes
- Frontend Playwright tests:
  - `/admin/audit` navigation and rendering
  - filter application (`scope`, `status`, search)
  - pagination (`Load more`) and refresh behavior
- Regression checks:
  - keep Phases 1-5 admin specs green
  - keep smoke spec green

## Verification Targets

- `pnpm.cmd --filter backend exec tsx --test src/tests/integration/admin-phase6.integration.test.ts`
- `pnpm.cmd --filter frontend typecheck`
- `pnpm.cmd --filter frontend lint`
- `pnpm.cmd --filter frontend test:e2e:smoke`
- `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase1-shell.spec.ts`
- `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase2-moderation-users.spec.ts`
- `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase3-community-analytics.spec.ts`
- `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase4-notifications-settings.spec.ts`
- `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase5-users-lifecycle.spec.ts`
- `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase6-audit-center.spec.ts`
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

- Risk: broad audit queries degrade performance with large tables.
  - Mitigation: bounded page size, indexed sort (`scope, created_at`) and targeted filters.
- Risk: route proliferation causes payload drift.
  - Mitigation: reuse shared audit query/serialization helpers.
- Risk: introducing unified page regresses existing admin navigation.
  - Mitigation: keep nav update minimal and run Phase 1-5 regression specs.

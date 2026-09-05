# Admin Phase 2 Design

## Context

- Phase 1 shipped the admin shell, navigation, placeholder routes, and baseline admin e2e coverage.
- Existing working admin workflows must be preserved:
  - `/admin/content` chapter publish flow
  - `/admin/forum` thread pin flow
- Phase 2 activates two previously placeholder sections:
  - `/admin/moderation` as an actionable moderation queue
  - `/admin/users` as a read-only searchable directory

## Approved Direction

- Approach: **Hybrid server prefetch + client panel controls**
- Add backend APIs and persistence for moderation flags.
- Use server component pages for initial data hydration (`cookies()` + admin API helpers).
- Use client components for interactive filtering, pagination, and resolve actions.

## Goals

- Deliver a working moderation lifecycle on `/admin/moderation`:
  - list paginated queue
  - filter by status (`open`, `resolved`)
  - filter by target type (`thread`, `reply`, `chapter`)
  - resolve open items with required moderator note (minimum 10 characters)
  - move resolved item out of open view and into resolved view
- Deliver a working read-only user directory on `/admin/users`:
  - paginated list
  - columns: name, email, role, created date
  - text search by name/email
  - role filter
- Preserve Phase 1 shell responsiveness and behavior:
  - mobile collapsible sidebar
  - topbar bell
  - topbar logout

## Non-goals

- No analytics dashboard implementation.
- No notification dispatch system.
- No user mutation actions (role change, suspend/disable, bulk actions).
- No redesign of student-facing UI.
- No behavior changes to `/admin/content` or `/admin/forum` beyond regression-safe integration.

## Data Model

- Add enum `moderation_target_type`: `thread | reply | chapter`.
- Add enum `moderation_status`: `open | resolved`.
- Add table `moderation_flags`:
  - `id` uuid primary key
  - `created_at` timestamp
  - `target_type` enum `moderation_target_type`
  - `target_id` text
  - `target_label` text
  - `reason` text
  - `status` enum `moderation_status` default `open`
  - `resolved_by` nullable FK to `user.id`
  - `resolved_at` nullable timestamp
  - `resolution_note` nullable text
- Add index for queue reads:
  - `(status, target_type, created_at desc)`
- Seed deterministic fixture rows across target types and statuses for e2e stability.

## Admin Audit Logging

- Extend `admin_audit_scope` to include `moderation` for explicit queue action attribution.
- On successful resolve action, persist an `admin_audit_logs` row with:
  - `scope: moderation`
  - `action: Resolve flag`
  - `target` derived from flag target metadata
  - `status: success`
  - `message` containing resolution note summary
  - actor identity from session (`actor_id`, `actor_name`)

## Backend API Contracts

### GET `/api/admin/moderation/flags`

- Query params:
  - `page` (default 1)
  - `pageSize` (default 20, bounded max)
  - `status` (`open|resolved`, default `open`)
  - `targetType` (`thread|reply|chapter`, optional)
- Auth requirements:
  - `401` unauthenticated
  - `403` authenticated non-admin
- Success payload:
  - `entries[]` with:
    - `id`, `createdAt`, `targetType`, `targetId`, `targetLabel`, `reason`, `status`
    - `resolvedBy`, `resolvedAt`, `resolutionNote` when resolved
  - `total`, `page`, `pageSize`, `hasMore`

### POST `/api/admin/moderation/flags/:id/resolve`

- Body:
  - `note: string` (trimmed minimum 10 chars)
- Auth requirements:
  - `401` unauthenticated
  - `403` authenticated non-admin
- Response behavior:
  - `400` invalid payload
  - `404` flag not found
  - `409` flag already resolved
  - `200` returns updated resolved flag
- Side effect:
  - Persist audit log entry for successful resolve.

### GET `/api/admin/users`

- Query params:
  - `page` (default 1)
  - `pageSize` (default 20, bounded max)
  - `q` (optional text search across name/email)
  - `role` (`student|admin`, optional)
- Auth requirements:
  - `401` unauthenticated
  - `403` authenticated non-admin
- Success payload:
  - `entries[]` with `id`, `name`, `email`, `role`, `createdAt`
  - `total`, `page`, `pageSize`, `hasMore`

## Frontend Architecture

- `frontend/lib/admin-api.ts`
  - add Zod schemas and typed helpers for:
    - moderation list fetch
    - moderation resolve mutation
    - users list fetch
- `/admin/moderation` page:
  - server prefetch first moderation page
  - render new `AdminModerationPanel`
- `/admin/users` page:
  - server prefetch first users page
  - render new `AdminUsersPanel`
- New client components:
  - moderation panel + table + resolve note dialog
  - users panel + users table
- Reuse existing primitives:
  - `PageHeader`, `SectionCard`, `Button`, `Input`, `Select`, `Textarea`, toast provider

## UI Behavior

### Moderation Queue

- Controls:
  - status filter (`Open`, `Resolved`)
  - target type filter (`All`, `Thread`, `Reply`, `Chapter`)
  - pagination (`Load more` pattern aligned with existing admin panels)
- Open rows:
  - show `Resolve` action
  - require note entry before submission
  - disable submit while pending
- Success behavior:
  - success toast
  - row removed from current open list immediately
  - appears under resolved filter after refresh/filter switch
- Failure behavior:
  - error toast
  - keep row unchanged

### Users Directory

- Controls:
  - text search (name/email)
  - role filter (all/admin/student)
  - pagination
- Table columns:
  - name, email, role badge, created date
- Read-only actions:
  - no mutating controls in Phase 2

## Error and Empty States

- Invalid request params show backend `400` responses and client-side error toast.
- Empty filter/search results show explicit empty state copy (not blank table).
- Data refresh failures preserve last known list data when possible.

## Testing Strategy (Test-First)

- Backend integration tests (red first):
  - moderation list auth/role/status/target filters/pagination
  - moderation resolve auth/role/validation/not-found/already-resolved/success
  - moderation resolve creates audit log entry
  - users list auth/role/search/role filter/pagination
- Frontend Playwright tests (red first):
  - moderation queue flow:
    - visit page, filter open/resolved, resolve with valid note, verify movement between states
    - verify note validation blocks short notes
  - users directory flow:
    - search by name/email
    - role filtering and pagination behavior
- Regression checks:
  - keep `admin-phase1-shell.spec.ts` green
  - keep smoke and existing student flows green

## Verification Targets

- `pnpm --filter frontend typecheck`
- `pnpm --filter frontend lint`
- `pnpm --filter frontend test:e2e:smoke`
- `pnpm --filter frontend exec playwright test tests/e2e/admin-phase1-shell.spec.ts`
- `pnpm --filter frontend exec playwright test <phase2-admin-spec>`
- `pnpm --filter backend typecheck`

## Risks and Mitigations

- Risk: moderation queue UI drift from existing admin panel interaction patterns.
  - Mitigation: reuse current panel patterns (refresh/load-more/toasts) and shared foundation components.
- Risk: introducing new audit scope enum causes migration mismatch.
  - Mitigation: add migration + schema update + integration assertions in same change set.
- Risk: e2e flakiness from nondeterministic fixture ordering.
  - Mitigation: deterministic seeds and explicit filtering assertions.

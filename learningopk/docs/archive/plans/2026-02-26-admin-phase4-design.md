# Admin Phase 4 Design

## Context

- Admin Phases 1-3 established:
  - shared admin shell + route completeness
  - moderation and users workflows
  - community and analytics workflows
- Remaining placeholder admin surfaces:
  - `/admin/notifications`
  - `/admin/settings`
- Existing admin flows must remain stable:
  - `/admin/content`
  - `/admin/forum`
  - `/admin/moderation`
  - `/admin/users`
  - `/admin/community`
  - `/admin/analytics`

## Approach Options

### Option A: UI-only placeholders with better copy

- Keep notifications/settings non-functional.
- Pros: lowest risk.
- Cons: no operational value for admin teams.

### Option B: Full automation suite

- Build notification scheduling, delivery tracking, segmentation engine, and full platform settings matrix in one phase.
- Pros: maximum feature scope.
- Cons: high implementation risk and long verification cycle.

### Option C (Recommended): Focused operational activation

- Implement a practical first release:
  - `/admin/notifications`: compose and send broadcast announcements immediately
  - `/admin/settings`: manage a small set of platform flags and values
- Pros: meaningful functionality with constrained scope and test surface.
- Cons: deeper automation and advanced settings remain for future phases.

## Approved Direction

- Approach: **Option C, backend-first vertical slices with strict TDD**
- Activate:
  - Notifications broadcast workflow
  - System settings management workflow
- Preserve existing admin behavior and layout patterns.

## Goals

- Deliver `/admin/notifications` with:
  - paginated notification history list
  - compose form (`title`, `message`, `audience`)
  - immediate send action with optimistic list refresh
  - audience values: `all`, `students`, `admins`
  - read-only delivery metadata for this phase (`createdBy`, `createdAt`, `status`)
- Deliver `/admin/settings` with:
  - paginated settings list
  - editable value controls for selected keys
  - server-validated updates with optimistic refresh
  - visible update metadata (`updatedBy`, `updatedAt`)
- Ensure successful notification send and setting update actions write admin audit logs.

## Non-goals

- No scheduled delivery or cron orchestration.
- No per-user notification inbox implementation.
- No destructive setting key delete/create in UI.
- No cross-product redesign.
- No behavior changes to prior admin sections except regression-safe integrations.

## Data Model

- Add enum `notification_audience`: `all | students | admins`.
- Add enum `notification_status`: `sent`.
- Add table `admin_notifications`:
  - `id` uuid primary key
  - `title` text
  - `message` text
  - `audience` enum
  - `status` enum default `sent`
  - `created_by` FK to `user.id`
  - `created_at` timestamp
- Add table `admin_settings`:
  - `key` text primary key
  - `value` text
  - `description` text
  - `updated_by` FK nullable to `user.id`
  - `updated_at` timestamp
- Seed deterministic defaults for settings and sample notification rows.

## Admin Audit Logging

- Extend `admin_audit_scope` to include:
  - `notifications`
  - `settings`
- On successful actions:
  - notifications: action `Send notification broadcast`
  - settings: action `Update setting`
  - status `success`, actor identity from session, concise message payload.

## Backend API Contracts

### GET `/api/admin/notifications`

- Query params:
  - `page` (default 1)
  - `pageSize` (default 20, max 100)
- Auth:
  - `401` unauthenticated
  - `403` non-admin
- Success:
  - `entries[]`: `id`, `title`, `message`, `audience`, `status`, `createdBy`, `createdAt`
  - `total`, `page`, `pageSize`, `hasMore`

### POST `/api/admin/notifications`

- Body:
  - `title` (min 5 chars)
  - `message` (min 10 chars)
  - `audience` (`all|students|admins`)
- Auth:
  - `401` unauthenticated
  - `403` non-admin
- Response:
  - `400` invalid payload
  - `201` returns created notification record
- Side effects:
  - persist `admin_notifications` row
  - persist audit log entry (`scope: notifications`)

### GET `/api/admin/settings`

- Query params:
  - `page` (default 1)
  - `pageSize` (default 20, max 100)
- Auth:
  - `401` unauthenticated
  - `403` non-admin
- Success:
  - `entries[]`: `key`, `value`, `description`, `updatedBy`, `updatedAt`
  - `total`, `page`, `pageSize`, `hasMore`

### POST `/api/admin/settings/:key`

- Body:
  - `value` (trimmed, min 1 char, max 2000)
- Auth:
  - `401` unauthenticated
  - `403` non-admin
- Response:
  - `400` invalid payload
  - `404` unknown setting key
  - `200` updated setting row
- Side effects:
  - persist setting update
  - persist audit log entry (`scope: settings`)

## Frontend Architecture

- `frontend/lib/admin-api.ts`
  - add notification and settings schemas/helpers
- `/admin/notifications`
  - server prefetch first notifications page
  - render `AdminNotificationsPanel`
- `/admin/settings`
  - server prefetch first settings page
  - render `AdminSettingsPanel`
- New components:
  - notifications panel + table + compose action
  - settings panel + editable table
- Reuse existing primitives:
  - `PageHeader`, `SectionCard`, `Button`, `Input`, `Select`, `Textarea`, toast

## UI Behavior

### Notifications

- Form fields:
  - title
  - message
  - audience
- On send success:
  - success toast
  - form resets
  - new row appears in list
- On send failure:
  - error toast
  - preserve form values

### Settings

- List settings in editable rows.
- Save action per row.
- On save success:
  - success toast
  - row metadata updates
- On save failure:
  - error toast
  - keep user input for retry

## Error and Empty States

- Empty lists show explicit copy.
- Invalid backend params return `400` and map to user-facing toast.
- Transient fetch failure keeps last-known data visible.

## Testing Strategy (Test-First)

- Backend integration tests:
  - notifications list/create auth + validation + pagination
  - settings list/update auth + validation + not-found
  - audit log assertions for both scopes
- Frontend Playwright tests:
  - notifications compose/send/list refresh flow
  - settings value update flow
- Regression checks:
  - keep admin phase1/phase2/phase3 specs green
  - keep smoke flow green

## Verification Targets

- `pnpm.cmd --filter backend exec tsx --test src/tests/integration/admin-phase4.integration.test.ts`
- `pnpm.cmd --filter frontend typecheck`
- `pnpm.cmd --filter frontend lint`
- `pnpm.cmd --filter frontend test:e2e:smoke`
- `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase1-shell.spec.ts`
- `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase2-moderation-users.spec.ts`
- `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase3-community-analytics.spec.ts`
- `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase4-notifications-settings.spec.ts`
- `pnpm.cmd --filter backend typecheck`

## Risks and Mitigations

- Risk: settings updates can introduce unsafe values.
  - Mitigation: strict server-side validation + seeded allowlist keys.
- Risk: notification form enables accidental spam in future phases.
  - Mitigation: phase scope is admin-only manual send with explicit audience selection and audit logging.
- Risk: migration and enum changes drift from schema snapshots.
  - Mitigation: migration + schema + integration tests in same change set.

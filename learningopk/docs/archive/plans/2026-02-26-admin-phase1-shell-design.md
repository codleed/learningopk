# Admin Phase 1 Shell Design

## Context

- The project already includes a functioning admin surface in:
  - `frontend/app/admin/page.tsx`
  - `frontend/app/admin/content/page.tsx`
  - `frontend/app/admin/forum/page.tsx`
  - `frontend/components/admin/*`
  - `backend/src/routes/admin.ts`
- Authentication and role-based access already work using server session + admin role checks.
- Requirement for this phase: ship a professional admin shell and complete navigation without breaking existing student routes or existing working admin actions.

## Approved Direction

- Approach: **Incremental Admin Shell over existing routes**
- Keep real auth/role guard in place (no mock login replacement).
- Preserve existing working admin pages (`/admin/content`, `/admin/forum`) and add placeholders for missing sections.

## Goals

- Establish an enterprise-style admin layout for `/admin/*` with:
  - dark persistent sidebar
  - top navbar with admin identity controls
  - light data-focused content area
- Ensure every admin section route resolves (no broken links).
- Keep student-facing app behavior unchanged.
- Keep backend admin APIs unchanged in Phase 1.

## Non-goals

- No backend schema or API changes for new admin features.
- No feature-complete implementation of later phases (analytics, notifications, settings internals, etc.).
- No replacement of existing content/forum moderation functionality.

## Route and Layout Architecture

- Add `frontend/app/admin/layout.tsx` as the dedicated admin route-group shell.
- `layout.tsx` responsibilities:
  - fetch session server-side once
  - wrap children with existing `AdminGuard`
  - render persistent admin sidebar + topbar + content viewport
- Existing admin routes remain:
  - `/admin`
  - `/admin/content`
  - `/admin/forum`
- Add new placeholder routes for navigation completeness:
  - `/admin/users`
  - `/admin/moderation`
  - `/admin/community`
  - `/admin/analytics`
  - `/admin/notifications`
  - `/admin/settings`

## Component Design

- Add admin shell primitives:
  - `frontend/components/admin/admin-shell.tsx`
  - `frontend/components/admin/admin-sidebar.tsx`
  - `frontend/components/admin/admin-topbar.tsx`
  - `frontend/components/admin/admin-nav-config.ts`
- Navigation config is single-source-of-truth:
  - label
  - href
  - icon
  - optional badge/section grouping
- Active route highlighting uses prefix logic for nested routes.

## Visual System (Admin-only)

- Scope admin look to shell-level classes; do not alter global student theme.
- Direction:
  - Sidebar: dark charcoal/navy
  - Main content: neutral/light panels and table-ready surfaces
  - Dense typography, compact spacing, clear hierarchy
  - Role/status badges with consistent color semantics
- Responsive behavior:
  - desktop: persistent sidebar
  - small screens: collapsible drawer/sidebar

## Data and Access Flow

- `getServerSession()` is called in admin layout.
- `AdminGuard` remains the access authority (`role === "admin"`).
- Topbar reads session for:
  - admin display name
  - role badge label (`admin` mapped to `Super Admin` in Phase 1 display)
- Existing admin API consumers continue unchanged.

## Placeholder UX Rules

- Placeholder pages render:
  - section heading
  - concise “coming in next sprint” description
  - optional action buttons that trigger explicit `"Coming Soon"` toast when not implemented
- No action silently fails.

## Error/Loading Handling

- Keep and reuse existing:
  - `frontend/app/admin/loading.tsx`
  - `frontend/app/admin/error.tsx`
- Ensure new routes inherit consistent admin loading/error behavior through layout.

## Verification Plan (Phase 1)

- Run:
  - `pnpm --filter frontend typecheck`
  - `pnpm --filter frontend lint`
  - `pnpm --filter frontend test:e2e:smoke`
- Add/adjust a lightweight admin smoke check to validate:
  - admin route rendering
  - shell navigation links resolve
  - no crash when navigating among admin sections

## Risks and Mitigations

- Risk: style conflict with existing admin content/forum panels.
  - Mitigation: wrap existing pages with new shell first; defer deep restyling to subsequent phases.
- Risk: duplicate navigation logic across files.
  - Mitigation: centralize all admin links in `admin-nav-config.ts`.
- Risk: accidental impact on student UI.
  - Mitigation: limit changes to `/admin/*` layout/components and keep global theme untouched.

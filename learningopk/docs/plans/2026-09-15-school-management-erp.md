# School Management ERP (Gauzy-inspired) — Design & Implementation Plan

**Date:** 2026-09-15
**Status:** In progress

## Goal

Build a full end-to-end school management system for LearningoPK, modeled on Ever
Gauzy (ever-co/ever-gauzy) — its HRM, CRM, approvals, invoicing, and
organization/RBAC design — adapted to this repo's stack (Express + Drizzle +
PostgreSQL, Better Auth sessions, Next.js frontend) and integrated with the
existing schools / teacher / classroom features without breaking them.

Research source: Ever Gauzy repo README, `packages/core/src/lib` module inventory
(~125 NestJS modules), `packages/contracts` data models, docs.gauzy.co feature
pages. Key Gauzy patterns ported here:

1. **Organization model** — Gauzy: `Tenant → Organization → org-scoped children`,
   every entity carries `organizationId`. Here: the existing `schools` table _is_
   the organization; every ERP table is school-scoped (`schoolId` FK). Platform
   admins (role `admin`) bypass school scoping, mirroring Gauzy SUPER_ADMIN.
2. **RBAC matrix** — Gauzy: `role` + `role_permission(roleId, permission,
enabled)` rows, permissions as a big enum embedded in JWT, tiny fixed system
   role list + custom roles per tenant. Here: `erp_roles` (system + custom, per
   school) + `erp_role_permissions` (permission matrix) + `erp_user_roles`
   (user × school × role, multiple roles allowed). Permissions live in
   `@learningopk/shared` as a string union. Enforced by `requirePermission`
   middleware (Redis-free, process-cached with short TTL, invalidated on change).
3. **Approvals engine** — Gauzy `approval_policy` + `request_approval(min_count,
polymorphic requestId/requestType, employee+team approvers)`. Ported nearly
   1:1 for time-off, expense, fee-waiver, and custom requests.
4. **Time off = policy + request + holiday** — clean split, statuses
   REQUESTED/APPROVED/REFUSED, approval quorum via the approvals engine.
5. **CRM = contacts (LEAD/CLIENT/VENDOR) + pipelines/stages + deals** — used for
   admissions pipeline (prospective students/parents → enrolled).
6. **Invoices** — Gauzy's single invoice/estimate model with line items, status
   lifecycle (DRAFT → SENT → PAID/VOID), partial payments. Here it powers student
   fee invoicing; fee structures generate invoices per class/term.
7. **Tags on everything** — one polymorphic tag system instead of per-entity
   tag columns.
8. **Dashboard/stats** — server-side aggregation endpoints feeding the ERP
   dashboard widgets (Gauzy `dashboard`/`stats` modules).

Deliberately NOT ported from Gauzy: multi-ORM abstraction, desktop
timer/screenshot machinery, Cube/Jitsu/OpenSearch infra, plugin runtime,
inventory/production, job-search. A school ERP doesn't need them, and the user
asked for speed and seamless integration with this repo.

## Architecture

```
backend/src/
├── lib/db/schema/erp/
│   ├── core.ts        # roles, role_permissions, user_roles, tags, tag_links, invitations
│   ├── hrm.ts         # employees, departments, positions, employment_types, teams,
│   │                  # attendance, time_off (policy/request), holidays, payroll, expenses
│   ├── crm.ts         # contacts (lead/client/vendor), pipelines, stages, deals
│   ├── finance.ts     # fee_structures + components, invoices + items, payments
│   ├── academics.ts   # academic_years, terms, school_classes, enrollments,
│   │                  # class_subjects, timetable, exams, grades, student_attendance
│   ├── approvals.ts   # approval_policies, request_approvals, approval voters
│   └── index.ts       # re-exports (consumed by ../schema.ts + drizzle config)
├── lib/erp/
│   ├── permissions.ts # permission list loading + TTL cache + invalidation
│   └── acl.ts         # requirePermission middleware, requireSchoolAccess
├── repositories/erp/  # one repository per module (core, hrm, crm, finance, academics, approvals)
├── routes/erp/        # routers: core, hrm, crm, finance, academics, approvals, dashboard
│   └── index.ts       # mounts all under /api/erp
└── scripts/seed-erp-demo.ts

frontend/
├── app/school/erp/…   # ERP pages under the existing school admin section
├── src/components/erp/…
└── src/lib/erp-api.ts # typed client (zod schemas, TanStack Query keys)

packages/shared/src/types/erp.ts  # permission strings + shared enums/types
```

API root: `/api/erp/*`, mounted in `server.ts`. Existing endpoints untouched.

### Access model (seamless with current auth)

1. `requireSession` (Better Auth cookie) → user id.
2. School scope resolution: platform `admin` role OR `schools.adminUserId == user`
   → full ERP access to that school; otherwise `erp_user_roles` for the user in
   the target school → union of role permissions.
3. `requirePermission("EMPLOYEE_EDIT")` style middleware guards each route;
   student self-service endpoints (`/api/erp/academics/my/*`, `/finance/my/invoices`)
   only return the session user's own data.

### Speed

- Every list endpoint paginated (`?page&pageSize`), indexed FKs and composite
  unique indexes on natural keys.
- Permission matrix cached in-process (60s TTL, invalidated on role changes) —
  zero extra DB round-trips on hot dashboards.
- Dashboard aggregates computed in grouped SQL, not N+1 loops.
- Drizzle prepared statements via `db` pool (existing).

## Modules & tables

| Module    | Tables                                                                                                                                                                                                                                                                                                            |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core      | erp_roles, erp_role_permissions, erp_user_roles, erp_tags, erp_tag_links, erp_invitations                                                                                                                                                                                                                         |
| HRM       | erp_departments, erp_positions, erp_employment_types, erp_employees, erp_teams, erp_team_members, erp_attendance_records, erp_time_off_policies, erp_time_off_requests, erp_official_holidays, erp_salary_structures, erp_salary_components, erp_payroll_runs, erp_payslips, erp_expense_categories, erp_expenses |
| CRM       | erp_contacts, erp_pipelines, erp_pipeline_stages, erp_deals                                                                                                                                                                                                                                                       |
| Finance   | erp_fee_structures, erp_fee_components, erp_invoices, erp_invoice_items, erp_payments                                                                                                                                                                                                                             |
| Academics | erp_academic_years, erp_terms, erp_school_classes, erp_enrollments, erp_class_subjects, erp_timetable_slots, erp_exams, erp_grades, erp_student_attendance                                                                                                                                                        |
| Approvals | erp_approval_policies, erp_request_approvals, erp_request_approval_voters                                                                                                                                                                                                                                         |

All business tables carry `schoolId` (Gauzy TenantOrganizationBaseEntity
pattern). Money columns are `numeric(12,2)`. Audit columns (`createdBy`) on
business documents. Soft-delete only where Gauzy has it and it matters
(employees `isActive` flag instead).

## Tasks

1. **Core schema + RBAC** — schema/erp files, migration `0039`, shared
   permission types, permission middleware + cache, core routes (roles CRUD,
   permission matrix editor endpoints, tags, invitations), system roles seeded
   per school (admin/teacher/staff/viewer) on-demand + on school create.
2. **HRM routes** — departments, positions, employees (directory + profiles),
   attendance (staff + student), time off (policy/request/approve via approvals),
   payroll runs + payslips, expenses.
3. **CRM routes** — contacts, pipelines/stages, deals, admissions funnel stats.
4. **Finance routes** — fee structures, invoice CRUD + status lifecycle,
   payments (partial), per-student invoice generation from fee structures.
5. **Academics routes** — academic years/terms, school classes, enrollments
   (links existing `users` with `role=student`), class subjects, timetable,
   exams + gradebook, student attendance. Self-service "my" endpoints.
6. **Approvals routes** — approval policies, generic request approvals with
   quorum voting; time-off integration.
7. **Dashboard route** — cross-module aggregates for the ERP landing page.
8. **Frontend** — ERP layout + nav under `/school/erp`, pages per module
   (TanStack Query per repo convention), dashboard widgets.
9. **Seed + verification** — `seed-erp-demo.ts` (one demo school with employees,
   pipeline, fees, classes, timetable), typecheck/lint green, integration tests
   for RBAC + happy paths of each module.

## Verification

- `pnpm run typecheck` and `pnpm run lint` green in backend + frontend.
- `pnpm run db:generate` produces migration; `pnpm run db:migrate` applies.
- Integration tests (`backend/src/tests/integration/erp*.test.ts`) with
  supertest against `createApp()` covering: permission enforcement matrix,
  HRM/CRM/finance/academics happy paths, approvals quorum.
- Demo seed script runs clean; ERP dashboard renders with seeded data.

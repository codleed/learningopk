# Complete Codebase Code Review Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to execute this plan phase-by-phase.

**Goal:** Perform a complete, phased code review of the LearningoPK monorepo, starting with authentication, and produce actionable findings grouped by severity, subsystem, and verification status.

**Architecture:** Review from trust boundaries inward. Start with authentication, session handling, and authorization because those findings affect the reliability of every later phase. Continue through student-facing product domains, then admin and content management, then infrastructure and cross-cutting quality areas such as tests, docs, performance, and consistency.

**Tech Stack:** pnpm monorepo, Next.js 16, React 19, Express 5, Better Auth, Drizzle ORM, PostgreSQL, Redis, Playwright, tsx test runner, TypeScript.

---

## Review Rules

1. Treat this as a code review, not a feature implementation pass.
2. Findings come first. Prefer bugs, security gaps, broken assumptions, behavioral regressions, and test blind spots over style comments.
3. For each phase, capture:
   - Confirmed findings with severity
   - Open questions that need runtime verification
   - Existing tests and missing tests
   - Docs drift between code, tests, and written contracts
4. Never trust frontend guards as sufficient authorization.
5. When a domain depends on auth or role state, trace both backend enforcement and frontend assumptions.

## Execution Model

Use focused reviewer roles. If agent dispatch is available, run these roles in parallel where the scopes do not overlap. If dispatch is not available, execute the same roles sequentially and keep the output grouped by role.

Reviewer roles:
- `auth-backend-reviewer`: sessions, Better Auth wiring, backend trust boundaries, role checks
- `auth-frontend-reviewer`: login/register/reset/logout UX, route protection, session fetches, redirect behavior
- `tests-and-docs-reviewer`: Playwright/integration coverage, verification scripts, contract drift
- `domain-reviewer`: student-facing product routes and API contracts
- `admin-reviewer`: admin-only routes, content mutations, moderation, auditability
- `infra-reviewer`: schema, migrations, env, workers, queueing, docker and edge concerns

## Phase Order

### Phase 1: Authentication, Sessions, and Authorization

**Why first:** Every protected route, admin flow, and user-scoped API depends on this layer. If auth assumptions are wrong, later findings are hard to interpret.

**Primary reviewer split:**
- `auth-backend-reviewer`
- `auth-frontend-reviewer`
- `tests-and-docs-reviewer`

**Review files:**
- `backend/src/lib/auth.ts`
- `backend/src/lib/session.ts`
- `backend/src/lib/admin.ts`
- `backend/src/routes/auth.ts`
- `backend/src/server.ts`
- `backend/src/scripts/verify-auth.ts`
- `frontend/src/lib/auth-client.ts`
- `frontend/src/lib/session.ts`
- `frontend/proxy.ts`
- `frontend/app/(auth)/login/page.tsx`
- `frontend/app/(auth)/register/page.tsx`
- `frontend/app/(auth)/forgot-password/page.tsx`
- `frontend/app/(auth)/reset-password/page.tsx`
- `frontend/src/components/auth/login-form.tsx`
- `frontend/src/components/auth/register-form.tsx`
- `frontend/src/components/auth/forgot-password-form.tsx`
- `frontend/src/components/auth/reset-password-form.tsx`
- `frontend/src/components/auth/logout-button.tsx`
- `frontend/app/admin/layout.tsx`
- `frontend/src/components/admin/admin-guard.tsx`
- `frontend/src/components/foundation/auth-layout-wrapper.tsx`
- `frontend/tests/e2e/auth-resilience.spec.ts`
- `frontend/tests/e2e/phase2-auth-dashboard.spec.ts`
- `frontend/tests/e2e/phase3-auth-layout-routes.spec.ts`
- `docs/redesign/api-contracts.md`
- `frontend/docs/AUTH_SCREENS_DESIGN.md`

**Review questions:**
- Is Better Auth configured correctly for trusted origins, session persistence, and user fields?
- Does backend auth rely on secure server-side checks, not frontend assumptions?
- Is `requireSession` sufficient for suspended, deleted, or partially provisioned users?
- Does admin authorization happen server-side on every admin mutation and read path?
- Do frontend route protections cover all authenticated surfaces, or only a subset?
- Do frontend session fetches, redirects, and logout flows behave consistently when backend is unavailable?
- Do docs describe the real auth contract, or outdated endpoint names and flows?

**Known hotspots to verify carefully:**
- `frontend/proxy.ts` only guards selected prefixes, while many other authenticated pages depend on page-level checks.
- `frontend` code calls Better Auth generated endpoints such as `/api/auth/get-session`, `/sign-in/email`, `/sign-up/email`, while docs describe normalized `/login` and `/session` paths.
- Admin protection is split across frontend `AdminGuard` and backend `requireAdminRole`; verify no admin path is missing backend enforcement.
- Registration flow fetches board/class options from `/api/forum/filters`, which couples auth onboarding to forum data availability.

**Outputs:**
- Auth findings report
- Auth coverage map
- Docs drift list
- Follow-up risks for all later phases

### Phase 2: Student Route Protection and Server Data Access

**Why second:** After confirming auth boundaries, review how authenticated student pages fetch and trust data across dashboard, learn, forum, and AI entry points.

**Primary reviewer split:**
- `domain-reviewer`
- `tests-and-docs-reviewer`

**Review files:**
- `frontend/app/(dashboard)/**/page.tsx`
- `frontend/app/(learn)/**/page.tsx`
- `frontend/app/forum/page.tsx`
- `frontend/app/forum/[threadId]/page.tsx`
- `frontend/app/ai-tutor/page.tsx`
- `frontend/src/components/foundation/app-shell.tsx`
- `frontend/src/components/foundation/left-rail.tsx`
- `frontend/src/lib/session.ts`
- `frontend/src/lib/forum-api.ts`
- `frontend/src/lib/learn-api.ts`
- `frontend/src/lib/progress-api.ts`
- `frontend/tests/e2e/smoke.spec.ts`
- `frontend/tests/e2e/phase2-auth-dashboard.spec.ts`
- `frontend/tests/e2e/phase3-auth-layout-routes.spec.ts`

**Review questions:**
- Do protected pages consistently redirect or degrade safely when session fetches fail?
- Is the split between proxy-level protection and page-level protection coherent?
- Do server components leak assumptions about board, class, or role?
- Are cookies forwarded consistently for server-side data fetching?
- Are shared shells and navigation safe for both student and admin states?

**Outputs:**
- Protected route coverage matrix
- SSR/session propagation findings
- Shell and navigation risk list

### Phase 3: Learn, Progress, Quizzes, Mock Exams, and Profile

**Why here:** These are the main student product flows and they depend on correct session scoping and user identity.

**Primary reviewer split:**
- `domain-reviewer`
- `tests-and-docs-reviewer`

**Review files:**
- `backend/src/routes/learn.ts`
- `backend/src/routes/progress.ts`
- `backend/src/routes/quiz.ts`
- `backend/src/routes/mock-exams.ts`
- `backend/src/routes/profile.ts`
- `backend/src/services/progress.service.ts`
- `backend/src/services/quiz.service.ts`
- `backend/src/services/xp.service.ts`
- `backend/src/repositories/learn.repository.ts`
- `backend/src/repositories/progress.repository.ts`
- `backend/src/repositories/quiz.repository.ts`
- `frontend/src/lib/progress-api.ts`
- `frontend/src/lib/progress-client.ts`
- `frontend/src/lib/profile-api.ts`
- `frontend/src/lib/mock-exams-api.ts`
- `frontend/src/components/learn/**`
- `frontend/src/components/dashboard/**`
- `frontend/tests/e2e/student-subject-graph.spec.ts`
- `frontend/tests/e2e/stats-screen.spec.ts`
- `backend/src/tests/integration/learn-subject-graph.integration.test.ts`
- `backend/src/tests/integration/curriculum-class-slug.integration.test.ts`

**Review questions:**
- Are board/class restrictions enforced server-side for learner-specific content?
- Do progress and quiz updates trust the authenticated user correctly?
- Are profile updates and image uploads scoped and validated safely?
- Are data contracts stable between backend responses and frontend expectations?
- Are there missing tests around cross-user data isolation or invalid subject/chapter access?

**Outputs:**
- Student domain findings report
- User-scope and data-integrity findings
- Missing coverage list

### Phase 4: Forum and Community Features

**Why here:** Forum includes public reads plus authenticated writes, moderation-sensitive actions, and user-generated content handling.

**Primary reviewer split:**
- `domain-reviewer`
- `admin-reviewer`
- `tests-and-docs-reviewer`

**Review files:**
- `backend/src/routes/forum.ts`
- `backend/src/services/forum.service.ts`
- `backend/src/repositories/forum.repository.ts`
- `backend/src/lib/ai-guardrails.ts`
- `frontend/src/lib/forum-api.ts`
- `frontend/src/components/forum/**`
- `frontend/app/forum/**`
- `backend/src/tests/integration/api-routes.integration.test.ts`
- `frontend/tests/e2e/phase1-forum-dashboard-chrome.spec.ts`

**Review questions:**
- Are write paths protected and scoped to the acting user?
- Are accept-answer, vote, and reply actions safe against cross-user abuse?
- Are moderation or content-blocking paths enforced consistently?
- Are thread detail and filter endpoints over-fetching or missing pagination?
- Are public endpoints exposing more user data than needed?

**Outputs:**
- Forum security and behavior findings
- Public/private boundary findings
- Performance and pagination concerns

### Phase 5: AI Tutor and Conversation Persistence

**Why here:** AI routes are authenticated, stateful, and expensive. They also mix user scope, persistence, and external provider interactions.

**Primary reviewer split:**
- `domain-reviewer`
- `infra-reviewer`
- `tests-and-docs-reviewer`

**Review files:**
- `backend/src/routes/ai-chat.ts`
- `backend/src/lib/mistral.ts`
- `backend/src/lib/queue.ts`
- `frontend/src/components/ai/**`
- `frontend/app/ai-tutor/**`
- `frontend/src/lib/socket-client.ts`
- `backend/src/scripts/verify-ai.ts`
- `backend/src/scripts/verify-ai-concurrency.ts`
- `backend/src/tests/integration/api-routes.integration.test.ts`

**Review questions:**
- Are AI sessions and messages isolated per user?
- Can one user read or mutate another user’s AI history?
- Are rate-limiting and guardrail expectations implemented or only documented?
- Are streaming and persistence failures handled without corrupting state?
- Are costs, retries, and queue interactions bounded?

**Outputs:**
- AI authz and data-isolation findings
- Operational risk list
- Test gap list

### Phase 6: Admin Surface, Moderation, Audit, and Content Management

**Why after auth:** This phase depends on Phase 1 conclusions because the admin route surface is large and high-risk.

**Primary reviewer split:**
- `admin-reviewer`
- `tests-and-docs-reviewer`
- `infra-reviewer`

**Review files:**
- `backend/src/routes/admin.ts`
- `backend/src/routes/chapter-media.ts`
- `backend/src/lib/chapter-graph.ts`
- `backend/src/lib/wiki-links.ts`
- `frontend/app/admin/**`
- `frontend/src/components/admin/**`
- `frontend/tests/e2e/admin-*.spec.ts`
- `backend/src/tests/integration/admin-phase2.integration.test.ts`
- `backend/src/tests/integration/admin-phase3.integration.test.ts`
- `backend/src/tests/integration/admin-phase4.integration.test.ts`
- `backend/src/tests/integration/admin-phase5.integration.test.ts`
- `backend/src/tests/integration/admin-phase6.integration.test.ts`
- `backend/src/tests/integration/admin-phase7.integration.test.ts`
- `backend/src/tests/integration/admin-phase8.integration.test.ts`

**Review questions:**
- Does every admin endpoint enforce admin role server-side before data access or mutation?
- Is the route file too large to review safely without extracting trust-boundary maps?
- Are audit logs complete for success and failure paths?
- Are destructive actions validated, scoped, and reversible where needed?
- Are admin UX guards aligned with backend enforcement?

**Outputs:**
- Admin authz findings
- Large-route maintainability risks
- Auditability and mutation-safety findings

### Phase 7: Data Layer, Schema, Repositories, Workers, and Runtime Infrastructure

**Why late:** This phase is cross-cutting. Earlier phases will already identify which data-layer concerns are user-visible and which are structural.

**Primary reviewer split:**
- `infra-reviewer`
- `tests-and-docs-reviewer`

**Review files:**
- `backend/src/lib/db/**`
- `backend/drizzle/**`
- `backend/src/repositories/**`
- `backend/src/lib/cache/**`
- `backend/src/lib/redis.ts`
- `backend/src/lib/env.ts`
- `backend/src/jobs/**`
- `backend/src/workers/**`
- `backend/src/scripts/healthcheck.ts`
- `infra/**`
- `docker-compose.yml`
- `drizzle.config.ts`

**Review questions:**
- Are schema, migrations, and runtime assumptions consistent?
- Do repositories enforce clear boundaries, or do routes bypass them inconsistently?
- Are workers and jobs safe under retries, duplicates, and partial failure?
- Are env requirements explicit and validated?
- Are infra docs and runtime config aligned with the current app topology?

**Outputs:**
- Infrastructure and data-layer findings
- Reliability and operability risks
- Migration and env drift list

### Phase 8: Shared Package, Tests, Docs, and Cross-Cutting Quality

**Why last:** This phase consolidates systemic issues discovered across all earlier phases.

**Primary reviewer split:**
- `tests-and-docs-reviewer`
- `infra-reviewer`

**Review files:**
- `packages/shared/**`
- `frontend/tests/e2e/**`
- `backend/src/tests/**`
- `docs/**`
- `README.md`
- `AGENTS.md`
- `project-overview.md`

**Review questions:**
- Do shared types and validators reflect actual runtime contracts?
- Are there dead docs, stale plans, or misleading architecture descriptions?
- Is test coverage concentrated in happy paths while missing abuse cases and regression edges?
- Are naming, response shapes, and route contracts internally consistent?

**Outputs:**
- Cross-cutting consistency report
- Test strategy gaps
- Documentation drift summary

## Execution Steps Per Phase

For each phase:

1. Build the file map for that phase.
2. Read the tests before forming conclusions about intended behavior.
3. Trace the trust boundary from request entry to data access to response.
4. Record only confirmed findings as findings.
5. Separate runtime assumptions into open questions.
6. Identify missing or weak tests.
7. Summarize the phase in a review note before moving on.

## Suggested Review Deliverable Format

For each phase, produce:

1. `Findings`
2. `Open Questions`
3. `Tests Reviewed / Missing`
4. `Docs Drift`
5. `Recommended Next Phase`

## Suggested Start Command Set For Phase 1

Use these when execution begins:

```bash
pnpm --filter backend auth:verify
pnpm --filter backend test:integration
pnpm --filter frontend test:e2e tests/e2e/auth-resilience.spec.ts
pnpm --filter frontend test:e2e tests/e2e/phase2-auth-dashboard.spec.ts
pnpm --filter frontend test:e2e tests/e2e/phase3-auth-layout-routes.spec.ts
```

## Exit Criteria

The full review is complete only when:
- All eight phases have a written findings note
- Authentication and admin findings have explicit severity
- Test gaps are documented per phase
- Docs drift has been called out where contracts differ from code
- Residual risks and unverified assumptions are listed clearly

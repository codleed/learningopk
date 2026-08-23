# CLAUDE.md — LearningoPK Agent Context

## What this project is

LearningoPK is a learning platform for 9th–10th grade Pakistani students (Federal,
Punjab, Sindh boards): board-specific chapter content, Socratic AI tutor, quizzes,
mock exams, past papers with AI-assisted grading, SRS flashcards, forum, XP /
streaks / leaderboards, progress tracking, teacher classrooms and assignments.

**Product goal: sold to schools and institutes for complete reliance on Learningo
as their learning platform.**

## Architecture decisions

- **One JS-stack product.** Next.js 16 + Express 5 + PostgreSQL 16 + Redis 7 +
  Drizzle ORM + Better Auth + Mistral AI. There is no second backend.
- **Single SaaS instance.** One production deployment; schools are scoped by data
  (`users.schoolId`, `schools` table, classroom ownership). No per-school stacks.
- **Frappe is gone.** The old plan to run a Frappe bench (`erpnext` + `hrms` +
  `education`, custom `learningo_core`/`learningo_school` apps) was dropped on
  2026-07-28; the remaining school-bench scaffold was removed from the repo on
  2026-08-23. Do not reintroduce Frappe, MariaDB, or Python services.
- **ERP features are out of scope.** Fees, payroll/salary, timetabling, admissions
  accounting belong to the school's existing ERP. Build learning-side features
  only; if a paying customer demands fee tracking, scope it as lightweight
  records inside this app before writing any code.
- **Auth:** Better Auth is the sole identity system (email OTP via Resend).
  Roles: student, teacher, moderator, admin (+ school principal flows).

## Repo map

- `learningopk/frontend/` — Next.js 16 App Router, radix-ui/shadcn-style primitives in `src/components/ui` (CVA), Playwright e2e.
- `learningopk/backend/` — Express routes → services → repositories → Drizzle. Zod validation from shared package. BullMQ workers.
- `learningopk/packages/shared/` — contracts used by both sides. Change here first when API payloads change.
- `learningopk/tools/mcp-*/` — standalone MCP dev tools (content-gen, db-mcp, i18n-mcp, routes-mcp). Not workspace members; not part of build/runtime.
- `learningopk/infra/` — nginx/pgbouncer/minio config. `docker-compose.yml` dev, `docker-compose.prod.yml` prod.

## Commands

See `learningopk/AGENTS.md` for the full list. Quick reference (from `learningopk/`):

```bash
npm run dev:all        # frontend :3000 + backend :3001
npm run docker:up      # postgres :5433 + redis + minio + pgbouncer + nginx
npm run lint && npm run typecheck
npm run db:migrate && npm run db:seed
```

Backend tests: `npm --workspace backend run test:unit` (no DB needed) / `test:integration` (needs docker stack up).
Frontend e2e: `npm --workspace frontend run test:e2e:smoke`.

## Guardrails

- Strict TypeScript, no `any`; ESM `.js` import extensions in backend.
- Never interpolate user input into queries; keep admin/teacher endpoints role-checked and classroom/school-scoped.
- AI teacher stays Socratic: hints and scaffolding, no answer-dumping; respect streaming path and the model-strategy cache/circuit-breaker.
- Preserve quiz answer shape (`a/b/c/d`), progress event types, leaderboard scopes, and shared-schema-first contract changes.

# LearningoPK

Learning platform for 9th–10th grade Pakistani students (Federal, Punjab, Sindh boards):
chapter content, Socratic AI tutor, quizzes, mock exams, past papers, flashcards with
spaced repetition, forum, XP/leaderboards, progress tracking, teacher classrooms, and
school-scoped administration. Sold to schools and institutes as a single-tenant-code
SaaS: one deployment, every school's data scoped by `users.schoolId`.

## Monorepo Layout

- `frontend/`: Next.js 16 App Router UI
- `backend/`: Express API, Better Auth, Drizzle
- `packages/shared/`: shared Zod schemas, types, constants
- `tools/mcp-*/`: standalone MCP dev tools (not part of the build; not installed by workspaces)
- `docker-compose.yml`: PostgreSQL 16 (:5433) + Redis 7 + MinIO + pgbouncer + nginx + backend
- `docker-compose.prod.yml`: production stack behind nginx
- `drizzle.config.ts`: Drizzle migration configuration

## Quick Start

1. Install dependencies:
   - `npm install`
2. Create environment files:
   - `frontend/.env.local` from `frontend/.env.local.example`
   - `backend/.env` from `backend/.env.example` and add `MISTRAL_API_KEY`
3. Start local services:
   - `npm run docker:up`
4. Apply schema:
   - `npm run db:migrate`
5. Seed (optional demo content):
   - `npm run db:seed`
6. Start both apps:
   - `npm run dev:all` (frontend :3000, backend :3001)

## Local Port Note

- PostgreSQL is exposed on host port `5433` to avoid collisions with an existing local PostgreSQL service on `5432`.

## Scope

School management ERP features (fees, payroll, timetables) are deliberately out of
scope. Learningo is the complete *learning* platform; accounting-grade admin stays
with whatever ERP a school already runs.

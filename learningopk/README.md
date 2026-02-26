# LearningoPK

## Monorepo Layout

- `frontend/`: Next.js 16 App Router UI
- `backend/`: Express API, Better Auth, Drizzle
- `docker-compose.yml`: PostgreSQL 16 + Redis 7
- `drizzle.config.ts`: Drizzle migration configuration

## Quick Start

1. Install dependencies:
   - `pnpm install`
2. Create environment files:
   - `frontend/.env.local` from `frontend/.env.local.example`
   - `backend/.env` from `backend/.env.example` and add `MISTRAL_API_KEY`
3. Start local services:
   - `pnpm docker:up`
4. Apply schema:
   - `pnpm db:migrate`
5. Start backend:
   - `pnpm dev:backend`
6. Start frontend:
   - `pnpm dev:frontend`

## Local Port Note

- PostgreSQL is exposed on host port `5433` to avoid collisions with an existing local PostgreSQL service on `5432`.

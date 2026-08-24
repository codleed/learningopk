# 8. Local Environment Setup

The AI coder must create all of the following configuration files
exactly as described.

## docker-compose.yml

Create this file at project root to spin up Postgres and Redis with one
command:

- version: \'3.8\'

- services: postgres --- image: postgres:16, port: 5432:5432, env:
  POSTGRES_DB=learningo, POSTGRES_USER=postgres,
  POSTGRES_PASSWORD=password

- services: redis --- image: redis:7-alpine, port: 6379:6379

- volumes: postgres_data and redis_data for persistence across
  restarts

## frontend/.env.local

The AI coder must create this file for the frontend app:

- NEXT_PUBLIC_APP_URL=http://localhost:3000
- NEXT_PUBLIC_BACKEND_URL=http://localhost:3001

## backend/.env

The AI coder must create this file for the Express backend app
(developer fills in MISTRAL_API_KEY):

- DATABASE_URL=postgresql://postgres:password@localhost:5432/learningo
- REDIS_URL=redis://localhost:6379
- BETTER_AUTH_SECRET=generate-a-random-32-char-string-here
- BETTER_AUTH_URL=http://localhost:3001
- FRONTEND_ORIGIN=http://localhost:3000
- MISTRAL_API_KEY=get-free-key-from-console.mistral.ai

## package.json Scripts

- dev:frontend: run Next.js frontend app

- dev:backend: run Express backend app

- dev:all: run frontend + backend together

- db:push: drizzle-kit push --- apply schema to local DB

- db:studio: drizzle-kit studio --- visual DB browser

- db:seed: tsx scripts/seed-content.ts --- run content seeder

- docker:up: docker compose up -d --- start Postgres + Redis

- docker:down: docker compose down --- stop containers

## Getting Started Instructions (README)

- 1\. Install pnpm: npm i -g pnpm

- 2\. Clone repo and run: pnpm install

- 3\. Start DB: pnpm docker:up

- 4\. Create frontend/.env.local and backend/.env from templates and
  fill in MISTRAL_API_KEY in backend/.env

- 5\. Push DB schema: pnpm db:push

- 6\. Seed content: pnpm db:seed (point to your PDF folder)

- 7\. Start backend: pnpm dev:backend (http://localhost:3001)

- 8\. Start frontend: pnpm dev:frontend (http://localhost:3000)

# 6. Folder Structure

The AI coding agent must use a split repo structure with separate
frontend and backend folders.

```text
learningopk/
|-- frontend/                         # Next.js app (UI only)
|   |-- app/
|   |   |-- (auth)/login/page.tsx
|   |   |-- (auth)/register/page.tsx
|   |   |-- (dashboard)/dashboard/page.tsx
|   |   |-- (dashboard)/dashboard/[subject]/page.tsx
|   |   |-- (learn)/[board]/[grade]/[subject]/page.tsx
|   |   |-- (learn)/[board]/[grade]/[subject]/[chapter]/page.tsx
|   |   |-- forum/page.tsx
|   |   `-- forum/[threadId]/page.tsx
|   |-- components/
|   |-- lib/
|   |   `-- auth-client.ts            # Better Auth client for browser
|   `-- middleware.ts                 # Route protection and redirects
|-- backend/                          # Express API app (business logic)
|   |-- src/
|   |   |-- server.ts                 # Express server bootstrap
|   |   |-- routes/
|   |   |   |-- auth.ts               # Better Auth mounted at /api/auth/*
|   |   |   |-- ai-chat.ts            # /api/ai/chat
|   |   |   |-- quiz.ts               # /api/quiz/submit
|   |   |   |-- forum.ts              # /api/forum/*
|   |   |   `-- progress.ts           # /api/progress
|   |   `-- lib/
|   |       |-- db/
|   |       |   |-- schema.ts
|   |       |   `-- index.ts
|   |       |-- auth.ts
|   |       `-- mistral.ts
|   `-- scripts/
|       |-- seed-content.ts
|       `-- seed-quizzes.ts
|-- docker-compose.yml                # Postgres + Redis
|-- drizzle.config.ts
`-- README.md
```

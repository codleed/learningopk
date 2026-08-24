# 3. System Architecture

The platform uses a split architecture with separate frontend and
backend applications:

- Frontend: Next.js App Router (`frontend/`)
- Backend: Express.js API server (`backend/`)

All data lives in local PostgreSQL. The AI teacher is called from the
Express backend to keep the Mistral API key secure.

## Request Flow

- Browser -> Next.js App Router in frontend/ (RSC + Client
  Components)

- Frontend components -> Express API in backend/ via /api/*

- Express API -> Drizzle ORM -> PostgreSQL (local Docker container)

- Express API -> Mistral AI API (free tier) for AI teacher streaming
  responses

- Better Auth in backend validates sessions and sets HTTP-only cookies

## Key Architectural Decisions

- **App Router only in frontend --- no Pages Router. Use server
  components for frontend data fetching where possible.**

- **Backend must be a separate Express.js app --- do not place
  production business APIs in Next.js route handlers for this project.**

- **Streaming AI responses --- use Vercel AI SDK\'s useChat in frontend
  - streamText in backend for real-time Socratic dialogue**

- **PDF seeding is a one-time CLI script --- not part of the running
  app. Run once to populate the DB.**

- **No external file storage needed --- store extracted text in
  PostgreSQL, not binary PDFs**

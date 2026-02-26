# 9. AI Coding Agent Instructions

If you are an AI coding agent reading this document, follow these
instructions precisely:

## Start Order --- Do NOT skip phases

- Always complete Phase 1 (auth + DB) before touching any feature

- Never create a feature that requires the DB without running
  migrations first

- Test each phase by running pnpm dev and manually verifying the
  feature works

## Critical Rules

- Never use the Pages Router --- App Router only in frontend

- Every database access must go through Drizzle ORM --- no raw SQL
  strings

- Never expose the MISTRAL_API_KEY to the client --- all Mistral calls
  happen in backend Express routes (/api/*)

- The AI system prompt must be defined server-side in
  backend/src/lib/mistral.ts --- never send it from client

- Every page that shows user data must first verify the session via
  backend Better Auth session validation

- All user input must be validated with Zod before processing

- Use TypeScript strictly --- no \'any\' types; enable strict: true in
  tsconfig.json

## Mistral Integration Specifics

- Model to use: mistral-small-latest (free tier, fast enough for
  tutoring)

- Install: pnpm add \@ai-sdk/mistral ai

- Max tokens: 500 per response (keeps the Socratic responses concise
  and free tier friendly)

- Temperature: 0.7 (enough variation to feel natural but not
  hallucinate facts)

- Stream all responses --- never wait for full completion before
  displaying

## shadcn/ui Components to Install

- pnpm dlx shadcn@latest init --- during setup choose: TypeScript,
  Tailwind, App Router

- Components needed: button, card, input, label, textarea, tabs,
  accordion, badge, avatar, dialog, sheet (for AI panel), progress,
  skeleton, toast, dropdown-menu, separator

## Common Pitfalls to Avoid

- Do not use useEffect for data fetching in server components --- use
  async/await directly

- Do not put \'use client\' on layout files --- only on leaf
  components that need interactivity

- Do not store session data in localStorage --- Better Auth handles
  sessions via cookies

- Do not hardcode board/subject names --- always fetch from DB to
  support future additions

- The PDF seeder must be idempotent --- check if chapter exists by
  slug before inserting


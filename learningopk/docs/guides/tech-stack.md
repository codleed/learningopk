# 2. Full Tech Stack

Every tool below is free, open-source, and runs entirely on a local
machine. No paid services are required for local development and
investor demo.

---

**Technology** **Purpose** **Notes**

---

**Next.js 16 (Frontend app only)** SSR + RSC UI layer

**Express.js (Backend API server)** Separate backend app for auth, AI,
quiz, forum, and progress APIs

**TypeScript** Type safety across Mandatory for AI agent
codebase reliability

**Tailwind CSS + UI components & Fast, professional-looking UI
shadcn/ui** styling

**Better Auth** Authentication system Email/password + OAuth, runs
locally

**PostgreSQL 16** Primary database Run via Docker locally

**Drizzle ORM** Database layer / Type-safe, works great with
migrations Next.js

**Redis (local via Session cache + rate Optional but recommended for
Docker)** limiting auth

**Mistral AI AI Agent Teacher Free tier; 1B free
(mistral-small)** tokens/month

**Vercel AI SDK** AI streaming in Works with any provider
Next.js including Mistral

**pdf-parse / PDF content extraction For seeding chapter content
pdf2json** from PDFs

**Zod** Schema validation Forms, API input validation

**React Hook Form** Form management Pairs with Zod

**date-fns** Date utilities For progress timestamps and
streaks

**Docker + Docker Local Postgres + Redis One command to start entire
Compose** backend

**pnpm** Package manager Faster installs than npm

---


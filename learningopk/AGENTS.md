# AGENTS.md - LearningoPK Development Guide

## Build / Lint / Test Commands

### Root Commands (from `learningopk/`)

```bash
pnpm dev:all          # Start frontend + backend concurrently
pnpm lint             # Lint all packages
pnpm typecheck        # TypeScript check all packages
pnpm db:generate      # Generate Drizzle migrations
pnpm db:migrate       # Run pending migrations
pnpm db:seed          # Seed database
```

### Backend Commands (from `learningopk/backend/`)

```bash
pnpm dev              # Start with tsx watch (port 3001)
pnpm build            # Compile to dist/
pnpm lint             # TypeScript check only
pnpm typecheck        # Same as lint

# Testing
pnpm test                    # Run all tests
pnpm test:unit               # Unit tests only
pnpm test:integration        # Integration tests only
pnpm test src/tests/unit/validators.unit.test.ts  # Single test

# Verification
pnpm healthcheck             # Verify services running
pnpm ai:verify               # Test AI chat
pnpm quiz:verify             # Test quiz submission
pnpm auth:verify             # Test authentication
```

### Frontend Commands (from `learningopk/frontend/`)

```bash
pnpm dev              # Start Next.js dev server (port 3000)
pnpm build            # Production build
pnpm lint             # ESLint check
pnpm typecheck        # TypeScript check
pnpm test:e2e                       # Run all e2e tests
pnpm test:e2e:smoke                 # Smoke tests only
pnpm test:e2e tests/e2e/smoke.spec.ts  # Single e2e test
```

---

## Code Style Guidelines

### General Principles
- **Strict TypeScript** - All code must pass strict mode
- **No `any`** - Use `unknown` or proper generics
- **ES Modules** - Use `.js` extensions in imports

### Backend (Express + Drizzle + Better Auth)

#### File Structure
```
backend/src/
├── routes/        # Express routers (ai-chat.ts, quiz.ts, etc.)
├── services/      # Business logic
├── repositories/  # Database queries
├── lib/           # Utilities (redis, session, response.ts)
├── middleware/    # Custom middleware
├── workers/       # BullMQ workers
└── tests/
    ├── unit/      # *.unit.test.ts
    └── integration/ # *.integration.test.ts
```

#### Naming
- Routes: `kebab-case` (e.g., `ai-chat.ts`)
- Services/Repositories: `camelCase` (e.g., `quiz.service.ts`)
- Database tables: `snake_case` (e.g., `user_progress`)
- Zod schemas: `CamelCase` + `Schema` suffix

#### Error Handling
```typescript
// Use errorResponse from src/lib/response.ts
res.status(400).json(errorResponse('Invalid input', 'VALIDATION_ERROR'))

// Success
res.json(successResponse(data))
```

#### Database
- Use **Drizzle ORM** for all queries
- Never interpolate user input in queries

---

### Frontend (Next.js 16 + Heroui + Tailwind CSS)

#### File Structure
```
frontend/
├── app/              # Next.js App Router pages
├── src/components/
│   └── ui/           # Reusable UI (Button, Card, Badge, Input)
└── tests/e2e/        # Playwright tests
```

#### UI Components
- Use `@/components/ui` (Button, Badge, Card, Input, etc.)
- Defined via **CVA** (Class Variance Authority)
- Follow 4px spacing grid, dark theme supported

#### Imports
```typescript
// Good
import { Button, Card, Badge } from "@/components/ui";

// Not this
import { Button } from "@/design-system/components/Button";
```

---

### Shared Conventions

#### Import Syntax
```typescript
// Backend - use .js extension for ESM
import { auth } from "../lib/auth.js";

// Frontend - use path aliases
import { Button } from "@/components/ui";
```

#### TypeScript
- Backend: `strict: true`, `NodeNext` module, `noUncheckedIndexedAccess`
- Frontend: `strict: true`, `bundler` module resolution

#### Git
- Branch: `feature/description`, `fix/description`
- Never commit secrets - use `.env` files

---

### Testing Guidelines

- **Unit tests**: `src/tests/unit/*.test.ts` - test functions in isolation
- **Integration tests**: `src/tests/integration/*.test.ts` - test API routes with supertest
- **E2E tests**: `tests/e2e/*.spec.ts` - Playwright browser tests

---

### Environment Setup

1. Copy `backend/.env.example` → `backend/.env`, add `DATABASE_URL`, `REDIS_URL`, `MISTRAL_API_KEY`
2. Copy `frontend/.env.local.example` → `frontend/.env.local`
3. Run `pnpm docker:up` to start PostgreSQL (port 5433) + Redis

---

### Database

- PostgreSQL 16 on port `5433`
- Redis 7 for caching/sessions
- Drizzle ORM for migrations/queries

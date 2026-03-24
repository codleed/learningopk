# Architecture Blueprint - LearningoPK

**Version:** 1.0  
**Date:** 2026-03-24  
**Status:** Proposed

---

## 1. Current State Analysis

### 1.1 Repository Structure

```
Learningo/
├── learningopk/                    # Main project workspace (pnpm monorepo)
│   ├── frontend/                  # Next.js 16 App Router (React 19)
│   ├── backend/                   # Express.js API server (TypeScript)
│   ├── infra/                     # Docker/infrastructure configs
│   ├── docs/                      # Project documentation
│   └── docker-compose.yml         # PostgreSQL, Redis, MinIO
├── .opencode/                     # Agent configurations
├── SPECS/                         # Feature specifications
├── *.md                           # Root-level documentation
└── learningopk/
```

### 1.2 Current Architecture Pattern

**Modular Monolith** with clear frontend/backend separation:

| Layer | Technology | Responsibility |
|-------|------------|----------------|
| **Frontend** | Next.js 16 (App Router) | UI, Server Components, Client Components |
| **Backend** | Express.js + TypeScript | REST API, Auth, Business Logic |
| **Database** | PostgreSQL 16 (Docker) | Primary data store |
| **Cache** | Redis 7 (Docker) | Session cache, Rate limiting |
| **Storage** | MinIO (Docker) | Media file storage |
| **AI** | Mistral AI (mistral-small) | Socratic AI teacher via Vercal AI SDK |

### 1.3 Current Directory Structure

**Frontend (`learningopk/frontend/`):**
```
frontend/
├── app/                    # Next.js App Router pages
├── components/
│   ├── ui/                 # Base UI components
│   ├── auth/               # Authentication components
│   ├── learn/              # Learning features (quiz, flashcard, etc.)
│   ├── admin/              # Admin panel components
│   └── foundation/         # Shell, layout, navigation
├── lib/                    # API clients, utilities
├── src/                    # Additional source
├── tests/e2e/              # Playwright tests
└── SPECS/                  # Frontend specs
```

**Backend (`learningopk/backend/`):**
```
backend/
├── src/
│   ├── routes/             # Express route handlers (auth, learn, forum, admin, progress, ai-chat, health)
│   ├── lib/
│   │   ├── db/             # Drizzle ORM schema + connection
│   │   ├── auth.ts         # Better Auth integration
│   │   ├── ai-guardrails.ts
│   │   ├── mistral.ts      # AI integration
│   │   ├── redis.ts        # Redis client
│   │   └── ...
│   ├── middleware/          # Express middleware (image-upload)
│   ├── scripts/            # Verification scripts
│   └── tests/             # Unit + Integration tests
├── scripts/                # Seed scripts
├── drizzle/                # Drizzle config
└── seed.ts                 # Database seeding
```

### 1.4 Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Frontend Framework | Next.js | 16.1.6 |
| UI Library | HeroUI + shadcn/ui | 2.8.10 / 3.8.5 |
| Backend Framework | Express.js | 5.1.0 |
| Language | TypeScript | 5.9.3 |
| Database ORM | Drizzle ORM | 0.44.7 |
| Database | PostgreSQL | 16 |
| Auth | Better Auth | 1.3.10 |
| AI SDK | Vercel AI + @ai-sdk/mistral | 6.0.97 / 3.0.20 |
| Cache | Redis | 7 |
| File Storage | MinIO | latest |
| Package Manager | pnpm | 10.30.1 |

### 1.5 Strengths of Current Architecture

1. **Clean separation** - Frontend/backend are distinct deployables
2. **Type safety** - Full TypeScript across stack
3. **Modular routes** - Backend routes organized by domain
4. **Database schema** - Well-structured with proper indexes and relationships
5. **AI integration** - Proper streaming via Vercel AI SDK
6. **Testing infrastructure** - Unit + Integration + E2E tests

### 1.6 Areas for Improvement

1. **Backend lacks layered structure** - Routes contain business logic mixed with HTTP handling
2. **No service layer** - Direct route-to-DB access
3. **Frontend components mixed** - `components/` lacks clear domain separation
4. **No shared packages** - Duplicated types/utilities between frontend/backend
5. **Lib directory ambiguity** - Contains both API clients and utilities
6. **Verification scripts in src/** - Should be separate from application code

---

## 2. Proposed Architecture Blueprint

### 2.1 Architecture Pattern: Layered Modular Monolith

The proposed architecture follows a **Layered Modular Monolith** with clear boundaries:

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (Next.js)                      │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│  │  Pages  │  │Components│  │  Hooks  │  │  Lib/   │       │
│  │ (App/)  │  │         │  │         │  │  API    │       │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘       │
└───────┼────────────┼────────────┼────────────┼─────────────┘
        │            │            │            │
        ▼            ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Express.js)                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  ROUTES (Controllers)                │   │
│  │   auth │ learn │ forum │ admin │ progress │ ai-chat │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                    │
│  ┌──────────────────────▼──────────────────────────────┐   │
│  │                   SERVICES                          │   │
│  │  Auth │ Learn │ Forum │ Admin │ Progress │ AI      │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                    │
│  ┌──────────────────────▼──────────────────────────────┐   │
│  │              DATA ACCESS (Repositories)              │   │
│  │         Drizzle ORM + PostgreSQL + Redis            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Proposed Directory Structure

```
Learningo/
├── learningopk/                    # Monorepo root
│   ├── apps/
│   │   ├── frontend/              # Next.js application
│   │   │   ├── src/
│   │   │   │   ├── app/           # App Router pages
│   │   │   │   │   ├── (auth)/    # Auth group route
│   │   │   │   │   ├── (dashboard)/ # Dashboard group route
│   │   │   │   │   └── api/       # API routes (if needed)
│   │   │   │   ├── components/
│   │   │   │   │   ├── ui/       # Base UI (shadcn/ui)
│   │   │   │   │   ├── auth/      # Auth-specific components
│   │   │   │   │   ├── learn/     # Learning domain
│   │   │   │   │   ├── forum/     # Forum domain
│   │   │   │   │   ├── admin/     # Admin domain
│   │   │   │   │   └── shared/    # Cross-domain components
│   │   │   │   ├── hooks/        # Custom React hooks
│   │   │   │   ├── lib/          # Utilities, API clients
│   │   │   │   └── types/        # Frontend-specific types
│   │   │   ├── tests/
│   │   │   └── package.json
│   │   │
│   │   └── backend/              # Express.js application
│   │       └── src/
│   │           ├── controllers/   # Route handlers (thin)
│   │           ├── services/      # Business logic
│   │           ├── repositories/  # Data access layer
│   │           ├── models/        # Drizzle schemas
│   │           ├── middleware/    # Express middleware
│   │           ├── routes/        # Route definitions
│   │           ├── lib/           # Shared utilities
│   │           │   ├── db/       # DB connection
│   │           │   ├── redis.ts  # Redis client
│   │           │   └── ai.ts     # AI provider
│   │           ├── scripts/       # CLI tools (seed, verify)
│   │           ├── server.ts     # Entry point
│   │           └── tests/
│   │
│   ├── packages/
│   │   └── shared/                # Shared types/utils
│   │       ├── types/            # Shared TypeScript interfaces
│   │       ├── validators/        # Zod schemas
│   │       └── utils/             # Common utilities
│   │
│   ├── infra/                     # Docker/infrastructure
│   ├── docker-compose.yml
│   ├── package.json              # Workspace root
│   └── pnpm-workspace.yaml
│
├── docs/                          # Project documentation
├── SPECS/                         # Feature specifications
└── .opencode/                     # Agent configs
```

### 2.3 Layer Definitions

#### Frontend Layers

| Layer | Purpose | Examples |
|-------|---------|----------|
| **App Router** | Page composition, layouts, server components | `app/(auth)/login/page.tsx` |
| **Components** | Reusable UI pieces | `components/ui/button.tsx` |
| **Domain Components** | Feature-specific components | `components/learn/quiz-runner.tsx` |
| **Hooks** | State management, side effects | `hooks/useQuizTimer.ts` |
| **Lib** | API clients, utilities | `lib/api-client.ts`, `lib/utils.ts` |

#### Backend Layers

| Layer | Purpose | Examples |
|-------|---------|----------|
| **Controllers** | HTTP request/response handling | `controllers/auth.controller.ts` |
| **Services** | Business logic, orchestration | `services/auth.service.ts` |
| **Repositories** | Data access, database queries | `repositories/user.repository.ts` |
| **Models** | Database schemas | `models/user.model.ts` |
| **Middleware** | Cross-cutting concerns | `middleware/auth.middleware.ts` |

### 2.4 Data Flow

```
Request → Middleware → Controller → Service → Repository → Database
                ↓
           (Response)
```

### 2.5 Module Organization

Each backend module follows consistent structure:

```
modules/
├── auth/
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.repository.ts
│   ├── auth.types.ts
│   └── auth.validator.ts
├── learn/
│   ├── learn.controller.ts
│   ├── learn.service.ts
│   ├── learn.repository.ts
│   └── ...
└── ...
```

---

## 3. Key Architectural Decisions

### 3.1 Keep Modular Monolith

**Decision:** Maintain monorepo with clear module boundaries rather than microservices.

**Rationale:**
- Project scope doesn't warrant microservices complexity
- Easier local development for investor demos
- Clear domain boundaries provide maintainability

### 3.2 Introduce Service Layer

**Decision:** Add explicit service layer between controllers and repositories.

**Rationale:**
- Business logic encapsulation
- Easier testing (mock services vs mock repositories)
- Reusable business operations across controllers

### 3.3 Shared Package

**Decision:** Create `packages/shared` for types, validators, utilities.

**Rationale:**
- Single source of truth for shared types
- Consistent validation schemas across frontend/backend
- Avoid type duplication

### 3.4 Repository Pattern

**Decision:** Implement repository pattern for data access.

**Rationale:**
- Testability - mock repositories easily
- Database abstraction - swap PostgreSQL if needed
- Clean query organization

### 3.5 Keep Express over Fastify

**Decision:** Continue with Express.js (already in use).

**Rationale:**
- Team familiarity
- Extensive ecosystem of middleware
- Adequate performance for project scale

---

## 4. Migration Guidance

### Phase 1: Foundation (Low Risk)

1. **Create `packages/shared`**
   - Move shared types from frontend/backend
   - Create Zod validation schemas
   - Export utilities

2. **Restructure Frontend**
   - Move `components/` to `apps/frontend/src/components/`
   - Create domain-specific subdirectories
   - Move `lib/` to `apps/frontend/src/lib/`

### Phase 2: Backend Layering (Medium Risk)

3. **Create Service Layer**
   - Extract business logic from routes into services
   - Keep routes as thin HTTP handlers
   - Maintain route signatures during transition

4. **Create Repository Layer**
   - Extract DB queries from services into repositories
   - Services call repositories for data
   - Use Drizzle ORM query builders

### Phase 3: Refinement (Low Risk)

5. **Update Import Paths**
   - Update all imports to use new structure
   - Update build configurations

6. **Verification**
   - Run full test suite
   - Verify all features work
   - Update documentation

### 4.1 Migration Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking API contracts | High | Maintain route signatures; version API if needed |
| Circular dependencies | Medium | Enforce layer rules (controller → service → repository) |
| Test failures | Medium | Write tests before migration; maintain passing tests |
| Performance regression | Low | Profile before/after; optimize queries if needed |

### 4.2 Backward Compatibility

- All existing API endpoints remain functional
- Frontend continues to work with existing API
- Incremental migration possible (no big-bang rewrite)

---

## 5. Future Considerations

### 5.1 Scaling Triggers

Consider microservices when:
- Team grows beyond 10 developers working on same codebase
- Distinct deployment cycles needed per domain
- Different scaling requirements per module

### 5.2 Caching Strategy

Current: Redis for sessions
Future: Consider Redis caching for:
- Frequently accessed chapter content
- Quiz questions (read-heavy)
- User progress summaries

### 5.3 API Gateway

Future consideration:
- Consolidate API entry points
- Rate limiting at gateway level
- Request logging/analytics

---

## 6. Summary

| Aspect | Current | Proposed |
|--------|---------|----------|
| **Pattern** | Modular with mixed layers | Layered Modular Monolith |
| **Backend Structure** | Routes + Lib | Controllers + Services + Repositories |
| **Frontend Structure** | Flat component dirs | Domain-organized components |
| **Shared Code** | Duplicated | `packages/shared` |
| **Business Logic** | In routes | In services |
| **Data Access** | In services | Via repositories |

### 6.1 Benefits of Proposed Architecture

1. **Separation of Concerns** - Each layer has distinct responsibility
2. **Testability** - Easy to unit test services and repositories
3. **Maintainability** - Clear locations for changes
4. **Scalability** - Modular structure supports growth
5. **Team Workflow** - Multiple devs can work on different modules

### 6.2 Effort Estimate

| Phase | Effort | Risk |
|-------|--------|------|
| Phase 1: Foundation | Low | Low |
| Phase 2: Backend Layering | Medium | Medium |
| Phase 3: Refinement | Low | Low |

**Total estimated migration time:** 1-2 sprints (depending on team size)

---

*Document Version: 1.0 | Last Updated: 2026-03-24*

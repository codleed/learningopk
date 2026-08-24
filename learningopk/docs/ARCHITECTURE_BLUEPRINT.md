# Repository Architecture Blueprint

## Status: PROPOSED

---

## 1. Current State Analysis

### 1.1 Directory Structure Overview

```
learningopk/
├── backend/
│   ├── src/
│   │   ├── controllers/     # EMPTY - unused
│   │   ├── lib/            # Core business logic
│   │   │   ├── db/         # Database schema and connection
│   │   │   ├── auth.ts
│   │   │   ├── env.ts
│   │   │   ├── minio.ts
│   │   │   ├── redis.ts
│   │   │   └── ...
│   │   ├── middleware/     # Express middleware
│   │   ├── routes/         # API route handlers
│   │   ├── scripts/        # Utility scripts
│   │   ├── tests/          # Unit and integration tests
│   │   └── server.ts       # App factory
│   ├── drizzle/            # Migrations
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── design-system/  # Reusable UI components
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── theme/
│   │   ├── Demo.tsx
│   │   └── ...
│   ├── app/               # Next.js App Router
│   ├── components/        # Page-specific components
│   ├── lib/              # Utilities
│   ├── tests/            # E2E tests
│   └── ...
├── infra/
│   └── minio/            # MinIO policies
├── docs/                 # Project documentation
│   ├── plans/            # Historical implementation plans (32 files)
│   └── perf/             # Performance benchmarks (8 files)
├── docker-compose.yml
├── drizzle.config.ts
├── package.json          # Workspace root
└── pnpm-workspace.yaml
```

### 1.2 Source Code Organization Assessment

**Backend (GOOD)**:

- Clean separation: routes, lib, middleware, tests
- Single responsibility per file
- Routes properly segmented by domain (admin, auth, forum, quiz, progress, etc.)
- Lib contains focused utilities (auth, db, redis, minio, etc.)

**Frontend (NEEDS IMPROVEMENT)**:

- `design-system/` properly separated
- `components/` at root level is ambiguous (page components vs reusable?)
- `lib/` location for utilities unclear

### 1.3 Documentation Organization Assessment

**Root Level** (17 .md files):

- `architecture.md` - Current system architecture
- `database.md` - Database schema documentation
- `features.md` - Feature list
- `folder-structure.md` - Directory structure doc
- `implementation-checklist.md` - Implementation tracking
- `improvements-v1.1.md` - Version improvements
- `project-overview.md` - Project summary
- `roadmap.md` - Project roadmap
- `setup.md` - Setup instructions
- `tech-stack.md` - Technology stack
- `Learningo_Guide.md` - User guide
- `ai-coding-agent.md` - Agent config
- `ui-implementation-checklist.md` - UI checklist
- `dashboard-style-unification-*.md` (4 files) - Phase-specific audits
- Plus 2 implementation-phase audit files

**SPECS/** (6 files, ~250KB total):

- Large spec files for UI/UX specifications
- ai-tutor-ui-spec.md, ai-tutor-ux-spec.md
- sidebar-ui-spec.md, sidebar-ux-spec.md
- unified-rail-ui-spec.md, unified-rail-impl-plan.md

**learningopk/docs/** (~40 files):

- `plans/`: 32 historical implementation plan files
- `perf/`: 8 performance benchmark JSON files

### 1.4 Configuration Files Inventory

| File                          | Purpose               | Status |
| ----------------------------- | --------------------- | ------ |
| package.json                  | Workspace root        | ✅     |
| pnpm-workspace.yaml           | Workspace config      | ✅     |
| docker-compose.yml            | Local dev services    | ✅     |
| drizzle.config.ts             | DB migrations         | ✅     |
| backend/.env.example          | Backend env template  | ✅     |
| frontend/.env.local.example   | Frontend env template | ✅     |
| backend/tsconfig.json         | Backend TypeScript    | ✅     |
| frontend/tsconfig.json        | Frontend TypeScript   | ✅     |
| frontend/eslint.config.mjs    | Frontend linting      | ✅     |
| frontend/next.config.ts       | Next.js config        | ✅     |
| frontend/components.json      | UI component config   | ✅     |
| frontend/postcss.config.mjs   | PostCSS config        | ✅     |
| frontend/playwright.config.ts | E2E test config       | ✅     |

**MISSING**:

- No CI/CD configuration (.github/workflows/)
- No Dockerfile for backend
- No container registry configuration

---

## 2. Target Architecture

### 2.1 Recommended Directory Structure

```
learningopk/
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── api/              # API layer
│   │   │   │   ├── routes/       # Route handlers
│   │   │   │   ├── middleware/    # Express middleware
│   │   │   │   └── schemas/      # Request/response validation
│   │   │   ├── lib/              # Core business logic
│   │   │   │   ├── db/           # Database (schema, queries)
│   │   │   │   ├── auth/         # Authentication
│   │   │   │   ├── cache/        # Redis operations
│   │   │   │   ├── storage/      # MinIO/S3 operations
│   │   │   │   └── ai/           # AI integrations
│   │   │   ├── services/          # Business logic services
│   │   │   ├── models/           # Domain models (if applicable)
│   │   │   ├── scripts/          # Maintenance scripts
│   │   │   ├── tests/
│   │   │   │   ├── unit/
│   │   │   │   └── integration/
│   │   │   ├── server.ts         # App entry
│   │   │   └── index.ts          # Public exports
│   │   ├── drizzle/              # Migrations
│   │   ├── .env.example
│   │   └── package.json
│   └── frontend/
│       ├── src/
│       │   ├── app/               # Next.js App Router
│       │   ├── components/        # Page components
│       │   │   ├── ui/           # Shadcn/ui components
│       │   │   └── features/     # Feature-specific components
│       │   ├── lib/              # Utilities
│       │   ├── hooks/            # Custom React hooks
│       │   ├── design-system/    # Shared design tokens & components
│       │   ├── tests/            # E2E tests
│       │   └── stores/           # State management (if needed)
│       ├── public/               # Static assets
│       ├── .env.local.example
│       └── package.json
├── packages/
│   └── shared/                   # Shared types, utils
│       ├── src/
│       │   ├── types/
│       │   ├── utils/
│       │   └── constants/
│       └── package.json
├── infra/
│   ├── docker-compose.yml       # Local dev services
│   ├── postgres/                # PostgreSQL configs
│   ├── redis/                   # Redis configs
│   └── minio/                   # MinIO configs & policies
├── docs/
│   ├── architecture/            # Architecture decision records
│   ├── api/                     # API documentation
│   ├── guides/                  # Developer guides
│   └── runbooks/                # Operations runbooks
├── scripts/                      # Cross-package scripts
│   ├── db-reset.sh
│   └── dev-setup.sh
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── package.json                  # Workspace root
├── pnpm-workspace.yaml
├── drizzle.config.ts
├── turbo.json                   # Turborepo config (recommended)
└── README.md
```

### 2.2 Separation of Concerns Principles

1. **Apps vs Packages**: Applications (backend, frontend) in `apps/`, shared code in `packages/`
2. **API Layer Isolation**: Routes only handle HTTP, business logic in `services/`
3. **Design System Isolation**: Shared UI components in `design-system/`, page components in `components/features/`
4. **Configuration Externalization**: All config via env vars, no hardcoded values
5. **Test Colocation**: Tests alongside source files or in `tests/` directory per package

---

## 3. Key Architectural Decisions (ADRs)

### ADR-001: Monorepo Structure

**Status**: Accepted

**Context**: The project currently has a flat structure with `backend/` and `frontend/` at root. As the project grows, sharing types and utilities between packages becomes harder.

**Decision**: Restructure to use Turborepo-style monorepo with `apps/` and `packages/` directories.

**Consequences**:

- ✅ Easier cross-package imports
- ✅ Shared TypeScript types between frontend and backend
- ✅ Unified build pipeline
- ❌ Requires migration of existing files
- ❌ Learning curve for new contributors

---

### ADR-002: Documentation Cleanup Strategy

**Status**: Accepted

**Context**: Repository has ~50+ documentation files across multiple locations with significant redundancy.

**Decision**:

- Consolidate SPECS into `docs/specs/`
- Move historical plans to `docs/archive/plans/`
- Keep only essential documentation at root
- Create `docs/architecture/` for ADRs

**Consequences**:

- ✅ Cleaner repository root
- ✅ Easier to find current documentation
- ✅ Historical context preserved but not cluttering
- ❌ Need to update references

---

### ADR-003: Controller Directory Removal

**Status**: Accepted

**Context**: `backend/src/controllers/` directory exists but is empty.

**Decision**: Remove empty `controllers/` directory.

**Consequences**:

- ✅ Cleaner structure
- ✅ No confusion about MVC pattern vs route-based organization

---

### ADR-004: CI/CD Pipeline Addition

**Status**: Accepted

**Context**: No CI/CD configuration exists in repository.

**Decision**: Add `.github/workflows/ci.yml` for:

- Lint and typecheck on PR
- Unit and integration tests
- Security scanning

**Consequences**:

- ✅ Automated quality gates
- ✅ Early vulnerability detection
- ❌ Requires GitHub Actions setup

---

## 4. Documentation Strategy

### 4.1 Essential Docs to KEEP

| File                | Location | Rationale                 |
| ------------------- | -------- | ------------------------- |
| README.md           | root     | Project entry point       |
| package.json        | root     | Package manager config    |
| pnpm-workspace.yaml | root     | Workspace config          |
| docker-compose.yml  | root     | Local development         |
| drizzle.config.ts   | root     | Database migration config |
| .gitignore          | root     | Git configuration         |

### 4.2 Essential Docs to CONSOLIDATE

| File                | Action                       | Rationale                   |
| ------------------- | ---------------------------- | --------------------------- |
| architecture.md     | Move to `docs/architecture/` | Historical architecture doc |
| database.md         | Move to `docs/architecture/` | Schema documentation        |
| features.md         | Move to `docs/guides/`       | Feature list                |
| folder-structure.md | Move to `docs/guides/`       | Directory guide             |
| tech-stack.md       | Move to `docs/guides/`       | Tech overview               |
| setup.md            | Move to `docs/guides/`       | Setup instructions          |
| roadmap.md          | Move to `docs/guides/`       | Project roadmap             |
| project-overview.md | Merge into README.md         | Redundant overview          |

### 4.3 Docs to DELETE (Redundant/Auto-generated)

| File                                         | Rationale                                           |
| -------------------------------------------- | --------------------------------------------------- |
| `dashboard-style-unification-*.md` (4 files) | Phase-specific audit files, implementation complete |
| `implementation-checklist.md`                | Historical tracking, stale                          |
| `improvements-v1.1.md`                       | Old version notes, superseded                       |
| `ui-implementation-checklist.md`             | Duplicate of other checklists                       |
| `Learningo_Guide.md`                         | User guide, not developer doc                       |
| `ai-coding-agent.md`                         | Agent config, not project doc                       |

### 4.4 SPECS to CONSOLIDATE

| File                   | Action                | Rationale                            |
| ---------------------- | --------------------- | ------------------------------------ |
| `SPECS/*.md` (6 files) | Move to `docs/specs/` | Large spec files, organized location |

### 4.5 Archive Historical Plans

| Location                     | Action                        | Rationale                       |
| ---------------------------- | ----------------------------- | ------------------------------- |
| `docs/plans/*.md` (32 files) | Move to `docs/archive/plans/` | Historical implementation plans |
| `docs/perf/*.md` (4 files)   | Move to `docs/archive/perf/`  | Historical perf docs            |
| `docs/perf/*.json` (8 files) | Move to `docs/archive/perf/`  | Performance benchmarks          |

---

## 5. Configuration Management

### 5.1 Environment Files

```
.env.example (backend)     → apps/backend/.env.example
.env.local.example (frontend) → apps/frontend/.env.local.example
```

### 5.2 Build Configuration

| Current                   | Target                     |
| ------------------------- | -------------------------- |
| Root package.json scripts | Turborepo pipeline         |
| Individual tsconfig.json  | Per-app tsconfig with base |

### 5.3 CI/CD Alignment

Target workflow structure:

```yaml
.github/
└── workflows/
    ├── ci.yml          # Lint, typecheck, test
    ├── preview.yml     # Vercel/Netlify preview
    └── production.yml  # Production deployment
```

---

## 6. Migration Steps

### Phase 1: Branch and Backup

1. Checkout `repo-cleanup/restructuring` branch
2. Create backup tag or snapshot

### Phase 2: Documentation Cleanup

1. Create `docs/archive/` directories
2. Move SPECS to `docs/specs/`
3. Move plans to `docs/archive/plans/`
4. Move perf files to `docs/archive/perf/`
5. Move root docs to `docs/architecture/` and `docs/guides/`
6. Delete redundant docs (after confirmation)
7. Merge project-overview into README.md

### Phase 3: Source Restructure

1. Create `apps/` directory
2. Move `backend/` to `apps/backend/`
3. Move `frontend/` to `apps/frontend/`
4. Create `packages/shared/` for shared types
5. Remove empty `controllers/` directory

### Phase 4: Configuration Updates

1. Update `drizzle.config.ts` path
2. Update `package.json` scripts for new paths
3. Update `pnpm-workspace.yaml` for new structure
4. Add `.github/workflows/ci.yml`

### Phase 5: Verification

1. Run lint and typecheck
2. Run tests
3. Verify docker-compose works
4. Verify dev servers start

---

## 7. Summary

### Issues Identified

1. Flat directory structure doesn't scale
2. 50+ documentation files with redundancy
3. Empty `controllers/` directory
4. No CI/CD pipeline
5. Historical plans cluttering active directories

### Decisions Proposed

1. Turborepo-style monorepo structure
2. Documentation consolidation and archival
3. CI/CD pipeline addition
4. Empty directory removal

### Risks

1. Path changes require import updates
2. Documentation references need updating
3. CI/CD needs initial setup and testing

---

**Blueprint Created**: 2026-03-25
**Status**: Pending Approval

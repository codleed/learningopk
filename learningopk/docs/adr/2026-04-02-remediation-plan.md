# Consolidated Backend Remediation Plan

**Date**: 2026-04-02
**Status**: In Progress
**Sources**: Security Review, Architecture Review, Code Quality Review, Database Review, Routes Review, Penetration Test

---

## Executive Summary

Five independent review streams audited the LearningoPK backend (Express.js + Drizzle ORM + PostgreSQL + Redis + BullMQ). This document consolidates all findings into a single prioritized action list.

**Total findings**: 70+ across all reviews
**Unique actionable items**: 32 (after deduplication)

---

## Priority 1: CRITICAL (Fix Before Any New Feature Work)

| #   | Issue                                                                                                   | Source               | File:Line                         | Status |
| --- | ------------------------------------------------------------------------------------------------------- | -------------------- | --------------------------------- | ------ |
| C-1 | session.ts type mismatch - `getSessionFromRequest` return type doesn't match `AuthenticatedRequest`     | Architecture, Routes | `lib/session.ts:61-66`            | TODO   |
| C-2 | forum.ts `session.user` access - `session?.user.id` fails because return type wraps user inside session | Routes               | `routes/forum.ts:111`             | TODO   |
| C-3 | No security headers (Helmet)                                                                            | Security             | `server.ts`                       | TODO   |
| C-4 | No JSON body size limit                                                                                 | Security             | `server.ts:37`                    | TODO   |
| C-5 | Hardcoded MinIO credentials in env defaults                                                             | Security             | `lib/env.ts:18-19`                | TODO   |
| C-6 | ILIKE wildcard injection in admin search                                                                | Security             | `routes/admin.ts:616-620,813-814` | TODO   |
| C-7 | Mock exams `/filters/options` unreachable (route ordering bug)                                          | Routes               | `routes/mock-exams.ts:72,264`     | TODO   |

## Priority 2: HIGH (Fix This Sprint)

| #   | Issue                                               | Source           | File:Line                                      | Status |
| --- | --------------------------------------------------- | ---------------- | ---------------------------------------------- | ------ |
| H-1 | No global error handler middleware                  | Security, Routes | `server.ts`                                    | TODO   |
| H-2 | No CSRF protection (SameSite cookie + Origin check) | Security         | `lib/auth.ts`, `server.ts`                     | TODO   |
| H-3 | No global rate limiting on API endpoints            | Security         | `server.ts`                                    | TODO   |
| H-4 | Presigned upload objectKey path traversal           | Security         | `routes/chapter-media.ts:247`                  | TODO   |
| H-5 | Error messages leak internal details                | Security         | `routes/quiz.ts:55`, `routes/progress.ts:55`   | TODO   |
| H-6 | Split admin.ts 5,371-line monolith                  | Architecture     | `routes/admin.ts`                              | TODO   |
| H-7 | Zod version mismatch (backend v4, shared v3)        | Code Quality     | `package.json`                                 | TODO   |
| H-8 | quiz.ts fragile string-matching error handling      | Routes           | `routes/quiz.ts:35-48`                         | TODO   |
| H-9 | XP farming via progress event replay                | Pentest          | `routes/progress.ts`, `services/xp.service.ts` | TODO   |

## Priority 3: MEDIUM (Fix Within 2 Sprints)

| #   | Issue                                             | Source               | File:Line                            | Status |
| --- | ------------------------------------------------- | -------------------- | ------------------------------------ | ------ |
| M-1 | Admin role check not middleware (fragile pattern) | Security             | `lib/admin.ts`, all admin routes     | TODO   |
| M-2 | No account lockout after failed login attempts    | Security             | `lib/auth.ts`                        | TODO   |
| M-3 | Forum body has no maximum length                  | Security             | `routes/forum.ts:14,28`              | TODO   |
| M-4 | BullMQ worker stub implementations                | Architecture         | `jobs/analytics.ts`, `jobs/email.ts` | TODO   |
| M-5 | Cache invalidation strategy missing               | Architecture         | `lib/cache/cache.service.ts`         | TODO   |
| M-6 | Inconsistent response shapes across routes        | Architecture, Routes | All route files                      | TODO   |
| M-7 | Race condition in XP award                        | Code Quality         | `services/xp.service.ts:133-184`     | TODO   |
| M-8 | Audit log writes can fail silently                | Security             | `routes/admin.ts:413-423`            | TODO   |

## Priority 4: LOW (Next Refactor Cycle)

| #   | Issue                                      | Source                 | File:Line                 | Status |
| --- | ------------------------------------------ | ---------------------- | ------------------------- | ------ |
| L-1 | Add request/correlation IDs                | Security, Architecture | `server.ts`               | TODO   |
| L-2 | Worker health checks endpoint              | Architecture           | `server.ts`               | TODO   |
| L-3 | Content moderation bypass (regex)          | Security               | `lib/ai-guardrails.ts`    | TODO   |
| L-4 | Forum self-vote prevention                 | Security               | `routes/forum.ts`         | TODO   |
| L-5 | Structured logging (replace console.error) | Security               | All files                 | TODO   |
| L-6 | NaN in mock exam parseInt                  | Routes                 | `routes/mock-exams.ts:17` | TODO   |
| L-7 | Hardcoded grade enum in progress routes    | Routes                 | `routes/progress.ts:29`   | TODO   |

## Test Fixes

| #   | Issue                                                                                                                  | File                                                           | Status |
| --- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------ |
| T-1 | phase11-access-control.integration.test.ts - 30 TS errors (possibly undefined, missing properties, wrong insert shape) | `tests/integration/phase11-access-control.integration.test.ts` | TODO   |

---

## Implementation Order

### Sprint 1 (Current Session)

1. **C-1 + C-2**: Fix session type + forum.ts (coupled - same root cause)
2. **C-7**: Fix mock-exams route ordering (5 min fix)
3. **C-3 + C-4**: Install Helmet + set body limit
4. **C-5**: Remove MinIO credential defaults
5. **C-6**: Add ILIKE wildcard escaping utility
6. **H-1**: Add global error handler
7. **T-1**: Fix test file type errors
8. **H-6**: Split admin.ts monolith

### Sprint 2

9. **H-2**: CSRF protection
10. **H-3**: Global rate limiting
11. **H-7**: Zod version alignment
12. **H-8**: Quiz error handling refactor
13. **M-1**: Admin middleware refactor
14. **M-3**: Forum body max length

### Sprint 3

15. **M-4**: Worker implementations
16. **M-5**: Cache invalidation
17. **M-6**: Response shape standardization
18. **M-7**: XP race condition fix
19. **L-1 through L-7**: Low priority items

---

_Generated from 5 review streams on 2026-04-02_

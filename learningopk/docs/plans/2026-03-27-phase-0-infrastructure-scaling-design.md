# Phase 0 Infrastructure Scaling Design

**Date:** 2026-03-27

**Scope:** `TASK-51A`, `TASK-51B`, `TASK-51C`, `TASK-51D`

## Goal

Introduce a scaling foundation for LearningoPK that reduces Postgres connection pressure, adds cacheable read paths for high-read content, centralizes database access behind repositories, and places Nginx in front of the backend for load balancing, auth-aware request gating, and rate limiting.

## Architectural Direction

Phase 0 should be implemented as one coordinated scaling layer, not four unrelated tickets. The steady-state request path becomes:

`client -> nginx -> backend instances -> repositories -> cache/db`

The backend remains the source of truth. Redis is an optimization layer and must never become required for correctness. Postgres remains authoritative for all persisted state.

## PgBouncer

PgBouncer should sit between backend application traffic and Postgres in transaction pooling mode.

- Add a `pgbouncer` service to Docker Compose.
- Configure `pool_mode = transaction`.
- Configure `max_client_conn = 500`.
- Configure `default_pool_size = 25`.
- Point the backend runtime `DATABASE_URL` to PgBouncer on port `6432`.
- Preserve a separate direct Postgres connection string for migrations and maintenance flows that should not go through transaction pooling.

This avoids exhausting Postgres connections during concurrent backend traffic while keeping operational workflows safe.

## Repository And Cache Model

Repositories should become the only application-layer modules allowed to execute Drizzle queries for runtime features. Services should keep orchestration and domain rules, but not issue raw selects, inserts, updates, or deletes themselves.

The initial bounded contexts are:

- `learn`
- `quiz`
- `forum`
- `progress`
- `ai-chat`
- `admin/shared` for the existing direct database access in routes and helper modules

Read-heavy repositories should adopt cache-aside behavior through a shared cache service:

- Subject listings: 1 hour TTL
- Chapter content bundles: 30 minute TTL
- Forum thread/detail payloads: 5 minute TTL

The following data must remain uncached:

- Quiz questions
- Progress data
- AI responses

Cache invalidation must be explicit and targeted. Any content mutation that changes subject listings, chapter content, or forum thread payloads should invalidate the relevant keys immediately after the database write succeeds.

## Cache Service

Create a central `CacheService` under `backend/src/lib/cache/cache.service.ts`.

Responsibilities:

- Typed key builders or typed key registration
- JSON serialization and deserialization
- TTL helpers
- Safe cache misses
- Delete-by-key invalidation
- Graceful Redis degradation

Redis failure must not break read requests for cacheable data. When Redis is unavailable, repositories should bypass cache and read from Postgres directly.

## Nginx Edge Layer

Nginx should become the reverse proxy and load balancer for backend traffic.

Responsibilities:

- Upstream backend cluster with 2-3 backend instances
- Per-IP rate limiting
- Authenticated-route gating via `auth_request`
- Health-check aware routing using readiness checks
- Gzip compression and buffer tuning

Because the current backend uses Better Auth session cookies instead of a standalone JWT issuance path, authenticated route validation should use `auth_request` against a backend validation endpoint rather than pure proxy-level JWT parsing.

The auth validation endpoint should:

- Read the existing Better Auth session from request headers/cookies
- Reject unauthorized or suspended users
- Return trusted identity headers for Nginx forwarding, including a normalized user ID

## Health Model

Health should be split into liveness and readiness endpoints.

- Liveness: process is alive and can serve basic HTTP
- Readiness: backend can serve real traffic through PgBouncer, Redis, and any required auth/session lookups

Nginx should use readiness, not liveness, when deciding whether to keep an instance in rotation.

## Failure Handling

Expected failure behavior:

- Redis down: cache bypass, DB fallback, request still succeeds where possible
- PgBouncer down: readiness fails, instance is removed from Nginx rotation
- Auth validation endpoint unavailable: protected routes fail closed, public routes continue
- Cache invalidation failure after successful mutation: mutation succeeds, failure is logged clearly

## Testing Strategy

Testing must cover both correctness and scaling behavior.

Unit coverage:

- Cache key generation
- JSON serialization and deserialization
- TTL policy behavior
- Cache hit and miss behavior
- Cache invalidation behavior
- Repository unit tests with mocked DB/cache dependencies

Integration coverage:

- Health live vs ready behavior
- Auth validation endpoint behavior
- Repository-backed route behavior after refactors
- Cache invalidation on content mutations

Infrastructure verification:

- Compose wiring for PgBouncer
- Backend startup against PgBouncer
- Nginx proxying and rate limiting
- 100+ concurrent requests or connections through the stack

## Rollout Sequence

1. Add shared infrastructure primitives: PgBouncer, Nginx config, health split, auth validation endpoint, cache service
2. Move runtime DB access into repositories by bounded context
3. Add cache-through behavior to allowed read paths
4. Update runtime traffic to flow through Nginx and PgBouncer
5. Verify concurrency, rate limiting, readiness, and cache invalidation behavior

## Out Of Scope

Phase 0 should not add:

- Cached quiz scoring payloads
- Cached student progress snapshots
- Cached AI completions or streamed AI responses
- A new JWT product surface independent from Better Auth unless a later requirement explicitly needs it

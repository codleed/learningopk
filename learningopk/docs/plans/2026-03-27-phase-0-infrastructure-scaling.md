# Phase 0 Infrastructure Scaling Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver `TASK-51A` through `TASK-51D` as one coordinated scaling layer with PgBouncer, Redis cache-through repositories, Nginx load balancing and auth gating, and full backend repository consolidation.

**Architecture:** Add shared infra primitives first, then move runtime data access behind repositories, then add cache-through reads and edge-layer routing. Keep Postgres authoritative, Redis optional, Better Auth session-based, and health checks split into liveness and readiness so Nginx can route only to ready instances.

**Tech Stack:** Docker Compose, PgBouncer, Nginx, Express, Better Auth, Drizzle ORM, Redis, TypeScript, Node test runner via `tsx --test`

---

### Task 1: Runtime Database Routing And PgBouncer Config

**Files:**

- Modify: `docker-compose.yml`
- Modify: `backend/src/lib/env.ts`
- Modify: `backend/src/lib/db/index.ts`
- Create: `infra/pgbouncer/pgbouncer.ini`
- Create: `infra/pgbouncer/users.txt`
- Test: `backend/src/tests/unit/db-routing.unit.test.ts`

**Step 1: Write the failing test**

```ts
import test from "node:test";
import assert from "node:assert/strict";

import { buildDatabaseConfig } from "../../lib/db/index.js";

test("prefers pooled runtime database url and preserves direct url", () => {
  const config = buildDatabaseConfig({
    DATABASE_URL: "postgresql://postgres:password@pgbouncer:6432/learningo",
    DATABASE_DIRECT_URL: "postgresql://postgres:password@postgres:5432/learningo",
  });

  assert.equal(config.runtimeUrl.includes(":6432"), true);
  assert.equal(config.directUrl.includes(":5432"), true);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter backend exec tsx --test src/tests/unit/db-routing.unit.test.ts`
Expected: FAIL because `buildDatabaseConfig` does not exist yet.

**Step 3: Write minimal implementation**

```ts
export const buildDatabaseConfig = (input: {
  DATABASE_URL: string;
  DATABASE_DIRECT_URL?: string;
}) => ({
  runtimeUrl: input.DATABASE_URL,
  directUrl: input.DATABASE_DIRECT_URL ?? input.DATABASE_URL,
});
```

Then wire:

- `docker-compose.yml` to add `pgbouncer`
- backend app env to use `postgresql://postgres:password@pgbouncer:6432/learningo`
- `DATABASE_DIRECT_URL` for direct Postgres access
- `infra/pgbouncer/pgbouncer.ini` with transaction pooling, `max_client_conn = 500`, `default_pool_size = 25`

**Step 4: Run test to verify it passes**

Run: `pnpm --filter backend exec tsx --test src/tests/unit/db-routing.unit.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add docker-compose.yml backend/src/lib/env.ts backend/src/lib/db/index.ts infra/pgbouncer/pgbouncer.ini infra/pgbouncer/users.txt backend/src/tests/unit/db-routing.unit.test.ts
git commit -m "TASK-51A: add pgbouncer runtime database routing"
```

### Task 2: Health Split And Auth Validation Endpoint

**Files:**

- Modify: `backend/src/server.ts`
- Modify: `backend/src/routes/health.ts`
- Modify: `backend/src/lib/session.ts`
- Create: `backend/src/routes/edge-auth.ts`
- Create: `backend/src/repositories/auth.repository.ts`
- Modify: `backend/src/repositories/index.ts`
- Test: `backend/src/tests/integration/edge-health-auth.integration.test.ts`

**Step 1: Write the failing test**

```ts
test("GET /api/health/live returns 200 without touching redis", async () => {
  const response = await request(createApp()).get("/api/health/live");
  assert.equal(response.status, 200);
});

test("GET /api/health/ready fails when dependencies are unavailable", async () => {
  const response = await request(createApp()).get("/api/health/ready");
  assert.equal([200, 503].includes(response.status), true);
});

test("GET /api/edge-auth/session returns 401 without a valid session", async () => {
  const response = await request(createApp()).get("/api/edge-auth/session");
  assert.equal(response.status, 401);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter backend exec tsx --test src/tests/integration/edge-health-auth.integration.test.ts`
Expected: FAIL because the new endpoints are missing.

**Step 3: Write minimal implementation**

```ts
edgeAuthRouter.get("/session", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  res
    .setHeader("x-authenticated-user-id", authedReq.session.user.id)
    .setHeader("x-authenticated-user-role", authedReq.session.user.role ?? "student")
    .status(204)
    .end();
});
```

Add:

- `/api/health/live`
- `/api/health/ready`
- repository-backed user status lookup in `requireSession`
- `/api/edge-auth/session` route mounted in `server.ts`

**Step 4: Run test to verify it passes**

Run: `pnpm --filter backend exec tsx --test src/tests/integration/edge-health-auth.integration.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/server.ts backend/src/routes/health.ts backend/src/routes/edge-auth.ts backend/src/lib/session.ts backend/src/repositories/auth.repository.ts backend/src/repositories/index.ts backend/src/tests/integration/edge-health-auth.integration.test.ts
git commit -m "TASK-51C: add readiness and edge auth validation routes"
```

### Task 3: Cache Service Foundation

**Files:**

- Create: `backend/src/lib/cache/cache.service.ts`
- Create: `backend/src/lib/cache/cache-keys.ts`
- Modify: `backend/src/lib/redis.ts`
- Test: `backend/src/tests/unit/cache.service.unit.test.ts`

**Step 1: Write the failing test**

```ts
test("stores and reads typed json values with ttl", async () => {
  const cache = new CacheService(fakeRedis);

  await cache.setJson({ key: "learn:subject-list:1", value: { subjectId: 1 }, ttlSeconds: 3600 });
  const value = await cache.getJson<{ subjectId: number }>("learn:subject-list:1");

  assert.deepEqual(value, { subjectId: 1 });
});

test("does not throw on cache miss", async () => {
  const cache = new CacheService(fakeRedis);
  assert.equal(await cache.getJson("missing:key"), null);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter backend exec tsx --test src/tests/unit/cache.service.unit.test.ts`
Expected: FAIL because cache service files do not exist.

**Step 3: Write minimal implementation**

```ts
export class CacheService {
  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async setJson(input: { key: string; value: unknown; ttlSeconds: number }) {
    await this.client.set(input.key, JSON.stringify(input.value), { EX: input.ttlSeconds });
  }
}
```

Also add key helpers for:

- subject listings
- chapter content bundles
- forum thread payloads

**Step 4: Run test to verify it passes**

Run: `pnpm --filter backend exec tsx --test src/tests/unit/cache.service.unit.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/lib/cache/cache.service.ts backend/src/lib/cache/cache-keys.ts backend/src/lib/redis.ts backend/src/tests/unit/cache.service.unit.test.ts
git commit -m "TASK-51B: add cache service foundation"
```

### Task 4: Learn Repository Cache-Through Reads

**Files:**

- Modify: `backend/src/repositories/learn.repository.ts`
- Modify: `backend/src/services/learn.service.ts`
- Modify: `backend/src/routes/learn.ts`
- Create: `backend/src/tests/unit/learn.repository.unit.test.ts`

**Step 1: Write the failing test**

```ts
test("returns cached chapter bundle before querying db", async () => {
  const repo = new LearnRepository({ db: fakeDb, cache: fakeCacheHit });
  const result = await repo.findChapterBundleBySlug({
    board: "punjab",
    grade: "9",
    subject: "physics",
    chapter: "motion",
  });

  assert.equal(fakeDb.wasCalled, false);
  assert.equal(result?.chapter.slug, "motion");
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter backend exec tsx --test src/tests/unit/learn.repository.unit.test.ts`
Expected: FAIL because cache-through entry points do not exist.

**Step 3: Write minimal implementation**

```ts
const cached = await this.cache.getJson<ChapterBundle>(chapterContentKey(params));
if (cached) return cached;

const bundle = await this.queryChapterBundle(params);
if (bundle) {
  await this.cache.setJson({ key: chapterContentKey(params), value: bundle, ttlSeconds: 1800 });
}
return bundle;
```

Remove direct Drizzle calls from `learn.service.ts` in favor of repository methods.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter backend exec tsx --test src/tests/unit/learn.repository.unit.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/repositories/learn.repository.ts backend/src/services/learn.service.ts backend/src/routes/learn.ts backend/src/tests/unit/learn.repository.unit.test.ts
git commit -m "TASK-51B: add learn repository cache-through reads"
```

### Task 5: Forum Repository Cache-Through Reads And Invalidation

**Files:**

- Modify: `backend/src/repositories/forum.repository.ts`
- Modify: `backend/src/services/forum.service.ts`
- Modify: `backend/src/routes/forum.ts`
- Create: `backend/src/tests/unit/forum.repository.unit.test.ts`

**Step 1: Write the failing test**

```ts
test("invalidates cached thread payload after reply creation", async () => {
  const repo = new ForumRepository({ db: fakeDb, cache: fakeCache });
  await repo.createReply({ threadId: "thread-1", userId: "user-1", body: "answer" });

  assert.deepEqual(fakeCache.deletedKeys, ["forum:thread:thread-1"]);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter backend exec tsx --test src/tests/unit/forum.repository.unit.test.ts`
Expected: FAIL because repository mutations do not invalidate cache yet.

**Step 3: Write minimal implementation**

```ts
await this.db.insert(forumReplies).values(input);
await this.cache.deleteMany([forumThreadKey(input.threadId), forumThreadFeedKey("default")]);
```

Move route-level thread/filter/detail queries behind repository-backed methods.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter backend exec tsx --test src/tests/unit/forum.repository.unit.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/repositories/forum.repository.ts backend/src/services/forum.service.ts backend/src/routes/forum.ts backend/src/tests/unit/forum.repository.unit.test.ts
git commit -m "TASK-51B: cache forum reads and invalidate on mutation"
```

### Task 6: Quiz And Progress Repository Consolidation

**Files:**

- Modify: `backend/src/repositories/quiz.repository.ts`
- Modify: `backend/src/repositories/progress.repository.ts`
- Modify: `backend/src/services/quiz.service.ts`
- Modify: `backend/src/services/progress.service.ts`
- Modify: `backend/src/lib/progress.ts`
- Create: `backend/src/tests/unit/progress.repository.unit.test.ts`
- Create: `backend/src/tests/unit/quiz.repository.unit.test.ts`

**Step 1: Write the failing test**

```ts
test("quiz service submits through repository and never caches quiz questions", async () => {
  const repo = new QuizRepository({ db: fakeDb, cache: fakeCache });
  await repo.findQuestionsByQuizId(12);

  assert.equal(fakeCache.getCalls.length, 0);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter backend exec tsx --test src/tests/unit/quiz.repository.unit.test.ts src/tests/unit/progress.repository.unit.test.ts`
Expected: FAIL because repository boundaries are incomplete.

**Step 3: Write minimal implementation**

```ts
export class QuizRepository {
  async findQuestionsByQuizId(quizId: number) {
    return this.db.select({/* ... */}).from(quizQuestions).where(eq(quizQuestions.quizId, quizId));
  }
}
```

Refactor `applyProgressEvent` so it depends on `ProgressRepository` instead of `db` directly.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter backend exec tsx --test src/tests/unit/quiz.repository.unit.test.ts src/tests/unit/progress.repository.unit.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/repositories/quiz.repository.ts backend/src/repositories/progress.repository.ts backend/src/services/quiz.service.ts backend/src/services/progress.service.ts backend/src/lib/progress.ts backend/src/tests/unit/quiz.repository.unit.test.ts backend/src/tests/unit/progress.repository.unit.test.ts
git commit -m "TASK-51D: move quiz and progress access into repositories"
```

### Task 7: AI Chat Repository Extraction

**Files:**

- Create: `backend/src/repositories/ai-chat.repository.ts`
- Modify: `backend/src/routes/ai-chat.ts`
- Modify: `backend/src/repositories/index.ts`
- Create: `backend/src/tests/integration/ai-chat.repository.integration.test.ts`

**Step 1: Write the failing test**

```ts
test("ai chat route persists session messages through repository", async () => {
  const repo = new AiChatRepository(fakeDb);
  await repo.createAssistantMessage({ sessionId: "session-1", content: "hello" });

  assert.equal(fakeDb.insertCalls[0]?.table, "ai_messages");
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter backend exec tsx --test src/tests/integration/ai-chat.repository.integration.test.ts`
Expected: FAIL because the repository does not exist.

**Step 3: Write minimal implementation**

```ts
export class AiChatRepository {
  createAssistantMessage(input: { sessionId: string; content: string }) {
    return this.db.insert(aiMessages).values({
      sessionId: input.sessionId,
      role: "assistant",
      content: input.content,
    });
  }
}
```

Move all direct `aiChatSessions`, `aiMessages`, and `aiUsageLogs` operations out of `routes/ai-chat.ts`.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter backend exec tsx --test src/tests/integration/ai-chat.repository.integration.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/repositories/ai-chat.repository.ts backend/src/routes/ai-chat.ts backend/src/repositories/index.ts backend/src/tests/integration/ai-chat.repository.integration.test.ts
git commit -m "TASK-51D: extract ai chat persistence repository"
```

### Task 8: Shared Catalog, Media, Graph, And Session Repository Cleanup

**Files:**

- Create: `backend/src/repositories/catalog.repository.ts`
- Create: `backend/src/repositories/media.repository.ts`
- Create: `backend/src/repositories/chapter-graph.repository.ts`
- Modify: `backend/src/routes/boards.ts`
- Modify: `backend/src/routes/subjects.ts`
- Modify: `backend/src/routes/classes.ts`
- Modify: `backend/src/routes/institutes.ts`
- Modify: `backend/src/routes/profile.ts`
- Modify: `backend/src/routes/chapter-media.ts`
- Modify: `backend/src/lib/admin.ts`
- Modify: `backend/src/lib/session.ts`
- Modify: `backend/src/lib/chapter-graph.ts`
- Modify: `backend/src/repositories/index.ts`
- Create: `backend/src/tests/unit/shared-repositories.unit.test.ts`

**Step 1: Write the failing test**

```ts
test("catalog repository serves boards list for route handlers", async () => {
  const repo = new CatalogRepository(fakeDb);
  const rows = await repo.listBoards();
  assert.equal(Array.isArray(rows), true);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter backend exec tsx --test src/tests/unit/shared-repositories.unit.test.ts`
Expected: FAIL because the shared repositories do not exist.

**Step 3: Write minimal implementation**

```ts
export class CatalogRepository {
  listBoards() {
    return this.db
      .select({ id: boards.id, name: boards.name, slug: boards.slug })
      .from(boards)
      .orderBy(asc(boards.name));
  }
}
```

Move direct DB access out of:

- simple catalog routes
- profile image persistence
- chapter media persistence
- admin role lookup
- subject graph helpers

**Step 4: Run test to verify it passes**

Run: `pnpm --filter backend exec tsx --test src/tests/unit/shared-repositories.unit.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/repositories/catalog.repository.ts backend/src/repositories/media.repository.ts backend/src/repositories/chapter-graph.repository.ts backend/src/routes/boards.ts backend/src/routes/subjects.ts backend/src/routes/classes.ts backend/src/routes/institutes.ts backend/src/routes/profile.ts backend/src/routes/chapter-media.ts backend/src/lib/admin.ts backend/src/lib/session.ts backend/src/lib/chapter-graph.ts backend/src/repositories/index.ts backend/src/tests/unit/shared-repositories.unit.test.ts
git commit -m "TASK-51D: remove shared direct db access"
```

### Task 9: Admin Route Repository Consolidation And Cache Invalidation Hooks

**Files:**

- Create: `backend/src/repositories/admin.repository.ts`
- Modify: `backend/src/routes/admin.ts`
- Modify: `backend/src/repositories/index.ts`
- Create: `backend/src/tests/integration/admin-cache-invalidation.integration.test.ts`

**Step 1: Write the failing test**

```ts
test("publishing chapter content invalidates learn cache keys", async () => {
  const response = await request(createApp())
    .post("/api/admin/chapters/123/publish")
    .set("cookie", adminSessionCookie);

  assert.equal(response.status, 200);
  assert.deepEqual(fakeCache.deletedKeys, [
    "learn:chapter-content:123",
    "learn:subject-list:subject-42",
  ]);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter backend exec tsx --test src/tests/integration/admin-cache-invalidation.integration.test.ts`
Expected: FAIL because admin mutations do not yet invalidate cache or route through repositories.

**Step 3: Write minimal implementation**

```ts
await adminRepository.publishChapter(chapterId);
await cacheService.deleteMany([chapterContentKeyById(chapterId), subjectListingKey(subjectId)]);
```

Consolidate direct admin route DB access into repository methods in incremental slices rather than leaving `routes/admin.ts` as the data layer.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter backend exec tsx --test src/tests/integration/admin-cache-invalidation.integration.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/repositories/admin.repository.ts backend/src/routes/admin.ts backend/src/repositories/index.ts backend/src/tests/integration/admin-cache-invalidation.integration.test.ts
git commit -m "TASK-51D: consolidate admin mutations and cache invalidation"
```

### Task 10: Nginx Load Balancing, Rate Limiting, And Compose Wiring

**Files:**

- Create: `infra/nginx.conf`
- Modify: `docker-compose.yml`
- Modify: `backend/src/server.ts`
- Test: `backend/src/tests/integration/nginx-edge-config.integration.test.ts`

**Step 1: Write the failing test**

```ts
test("nginx config defines health-aware upstream and auth_request for protected routes", async () => {
  const config = await readFile(new URL("../../../infra/nginx.conf", import.meta.url), "utf8");
  assert.match(config, /upstream backend_cluster/);
  assert.match(config, /auth_request \/__auth_session/);
  assert.match(config, /limit_req_zone/);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter backend exec tsx --test src/tests/integration/nginx-edge-config.integration.test.ts`
Expected: FAIL because `infra/nginx.conf` does not exist.

**Step 3: Write minimal implementation**

```nginx
upstream backend_cluster {
  server backend-1:3001;
  server backend-2:3001;
}

location /api/health/live {
  proxy_pass http://backend_cluster;
}

location /api/ {
  auth_request /__auth_session;
  proxy_pass http://backend_cluster;
}
```

Add rate limits for:

- `1000 req/min` per IP
- `100 req/min` per authenticated user

Mount Nginx into Compose and define 2-3 backend app instances or documented scale targets.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter backend exec tsx --test src/tests/integration/nginx-edge-config.integration.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add infra/nginx.conf docker-compose.yml backend/src/server.ts backend/src/tests/integration/nginx-edge-config.integration.test.ts
git commit -m "TASK-51C: add nginx load balancing and rate limiting"
```

### Task 11: End-To-End Scaling Verification

**Files:**

- Create: `backend/src/scripts/verify-phase0-scaling.ts`
- Create: `backend/src/tests/integration/phase0-scaling.integration.test.ts`
- Modify: `backend/package.json`

**Step 1: Write the failing test**

```ts
test("phase 0 scaling verification script asserts 100 concurrent requests complete successfully", async () => {
  const result = await runPhase0ScalingVerification();
  assert.equal(result.concurrentRequestCount >= 100, true);
  assert.equal(result.failures, 0);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter backend exec tsx --test src/tests/integration/phase0-scaling.integration.test.ts`
Expected: FAIL because the verification script does not exist.

**Step 3: Write minimal implementation**

```ts
const requests = Array.from({ length: 100 }, () => fetch(`${baseUrl}/api/health/live`));
const results = await Promise.allSettled(requests);
return {
  concurrentRequestCount: results.length,
  failures: results.filter((result) => result.status === "rejected").length,
};
```

Also verify:

- backend is talking to PgBouncer on `6432`
- public health endpoints proxy through Nginx
- protected routes reject without session
- rate limiting returns `429` once thresholds are exceeded

**Step 4: Run test to verify it passes**

Run: `pnpm --filter backend exec tsx --test src/tests/integration/phase0-scaling.integration.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/scripts/verify-phase0-scaling.ts backend/src/tests/integration/phase0-scaling.integration.test.ts backend/package.json
git commit -m "TASK-51A: verify phase 0 scaling behavior"
```

### Task 12: Final Verification And Kanban Update

**Files:**

- Modify: `../KANBAN.md`

**Step 1: Run focused backend unit tests**

Run: `pnpm --filter backend test:unit`
Expected: PASS

**Step 2: Run focused backend integration tests**

Run: `pnpm --filter backend test:integration`
Expected: PASS

**Step 3: Run phase 0 verification script**

Run: `pnpm --filter backend exec tsx src/scripts/verify-phase0-scaling.ts`
Expected: PASS with 100+ concurrent requests and no failed health checks

**Step 4: Update Kanban**

Move:

- `TASK-51A`
- `TASK-51B`
- `TASK-51C`
- `TASK-51D`

from `In Progress` to `Done` only after verification passes.

**Step 5: Commit**

```bash
git add ../KANBAN.md
git commit -m "TASK-51D: mark phase 0 scaling tasks done"
```

## Notes For Execution

- Keep `DATABASE_DIRECT_URL` for migrations and maintenance flows.
- Do not route quiz questions, progress payloads, or AI completions through Redis cache.
- Prefer constructor-injected repositories so unit tests can stub DB and cache behavior cleanly.
- Treat `routes/admin.ts` as a migration target, not a place for new Drizzle calls.
- If Nginx user-keyed rate limiting cannot be implemented entirely in native directives, forward the normalized user identity header and keep the authoritative session validation in the backend.

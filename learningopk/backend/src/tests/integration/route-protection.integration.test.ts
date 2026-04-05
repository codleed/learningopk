import assert from "node:assert/strict";
import { after, test } from "node:test";

import request from "supertest";

import { pool } from "../../lib/db/index.js";
import { redis } from "../../lib/redis.js";
import { createApp } from "../../server.js";

/**
 * Route protection expectations test.
 *
 * Validates the backend API route access control expectations documented in
 * docs/route-protection-matrix.md. Ensures that:
 * - Public endpoints return 200 without authentication
 * - Protected endpoints return 401 without authentication
 * - Admin endpoints return 401/403 without admin role
 */

after(async () => {
  await redis.quit();
  await pool.end();
});

test("public forum endpoints are accessible without authentication", async () => {
  const app = createApp();
  const agent = request(app);

  const threadsResponse = await agent.get("/api/forum/threads");
  assert.equal(threadsResponse.status, 200, "GET /api/forum/threads should be public.");

  const filtersResponse = await agent.get("/api/forum/filters");
  assert.equal(filtersResponse.status, 200, "GET /api/forum/filters should be public.");
});

test("forum mutation endpoints reject unauthenticated requests", async () => {
  const app = createApp();
  const agent = request(app);

  const createThread = await agent.post("/api/forum/threads").send({
    title: "Auth test thread",
    body: "Should be rejected without auth."
  });
  assert.equal(createThread.status, 401, "POST /api/forum/threads should require auth.");

  const createReply = await agent.post("/api/forum/threads/00000000-0000-0000-0000-000000000001/replies").send({
    body: "Should be rejected."
  });
  assert.equal(createReply.status, 401, "POST /api/forum/threads/:id/replies should require auth.");

  const voteReply = await agent.post("/api/forum/replies/00000000-0000-0000-0000-000000000001/vote").send({
    voteType: "upvote"
  });
  assert.equal(voteReply.status, 401, "POST /api/forum/replies/:id/vote should require auth.");

  const acceptReply = await agent.post("/api/forum/replies/00000000-0000-0000-0000-000000000001/accept").send({});
  assert.equal(acceptReply.status, 401, "POST /api/forum/replies/:id/accept should require auth.");
});

test("progress dashboard endpoint requires authentication", async () => {
  const app = createApp();
  const agent = request(app);

  const response = await agent.get("/api/progress/dashboard");
  assert.equal(response.status, 401, "GET /api/progress/dashboard should require auth.");
});

test("health endpoint is public", async () => {
  const app = createApp();
  const agent = request(app);

  const response = await agent.get("/api/health");
  assert.equal(response.status, 200, "GET /api/health should be public.");
});

test("admin endpoints reject unauthenticated requests", async () => {
  const app = createApp();
  const agent = request(app);

  const overviewResponse = await agent.get("/api/admin/overview");
  assert.ok(
    overviewResponse.status === 401 || overviewResponse.status === 403,
    `GET /api/admin/overview should reject unauthenticated requests, got ${overviewResponse.status}.`
  );
});

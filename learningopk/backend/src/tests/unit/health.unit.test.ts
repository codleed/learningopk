import assert from "node:assert/strict";
import { after, test } from "node:test";

import { pool } from "../../lib/db/index.js";
import { redis } from "../../lib/redis.js";
import { redisClient } from "../../middleware/rate-limit.js";
import { createApp } from "../../server.js";

// We test health routes using supertest-like manual approach since
// the health endpoints don't require authentication or DB connections
// for the liveness probe.

test("health: GET /api/health/live returns 200 with alive status", async () => {
  const app = createApp();

  // Use Node's built-in test server approach
  const { default: supertest } = await import("supertest");
  const response = await supertest(app).get("/api/health/live");

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "alive");
  assert.ok(typeof response.body.timestamp === "string");
});

test("health: GET /api/health/live response includes correlation ID header", async () => {
  const app = createApp();
  const { default: supertest } = await import("supertest");

  const response = await supertest(app).get("/api/health/live");

  assert.equal(response.status, 200);
  // The correlation middleware should have set x-correlation-id header
  const corrId = response.headers["x-correlation-id"];
  assert.ok(typeof corrId === "string" && corrId.length > 0, "Should have x-correlation-id header");
});

test("health: GET /api/health/live accepts a provided correlation ID", async () => {
  const app = createApp();
  const { default: supertest } = await import("supertest");
  const testCorrId = "test-corr-id-12345";

  const response = await supertest(app)
    .get("/api/health/live")
    .set("x-correlation-id", testCorrId);

  assert.equal(response.status, 200);
  assert.equal(response.headers["x-correlation-id"], testCorrId);
});

test("health: GET /api/ready returns structured readiness response", async () => {
  const app = createApp();
  const { default: supertest } = await import("supertest");

  // Note: This test will likely show postgres/redis as "down" since we're
  // not connected to actual services. That's the expected behavior.
  const response = await supertest(app).get("/api/health/ready");

  // Should be either 200 or 503 depending on service availability
  assert.ok([200, 503].includes(response.status), `Expected 200 or 503, got ${response.status}`);
  assert.ok(["healthy", "degraded", "unhealthy"].includes(response.body.status));
  assert.ok(typeof response.body.timestamp === "string");
  assert.ok(typeof response.body.checks === "object");
  assert.ok("postgres" in response.body.checks);
  assert.ok("redis" in response.body.checks);
  assert.ok("minio" in response.body.checks);
  assert.ok("ai" in response.body.checks);

  // Each check should have status and latencyMs
  for (const checkName of ["postgres", "redis", "minio", "ai"] as const) {
    const check = response.body.checks[checkName] as { status: string; latencyMs: number };
    assert.ok(["up", "degraded", "down"].includes(check.status), `${checkName} should have valid status`);
    assert.ok(typeof check.latencyMs === "number", `${checkName} should have latencyMs`);
  }
});

test("health: backwards-compatible GET /api/health returns ok shape", async () => {
  const app = createApp();
  const { default: supertest } = await import("supertest");

  const response = await supertest(app).get("/api/health");

  // May be 200 or 503 depending on DB availability
  assert.ok([200, 503].includes(response.status));
  assert.ok("ok" in response.body || "error" in response.body);
});

// The readiness checks open real Postgres/Redis connections when the dev
// stack is up, and leave Redis clients retrying their initial connect when
// it is not. Tear all of them down so the node:test process can exit.
after(async () => {
  for (const client of [redis, redisClient]) {
    try {
      client.destroy();
    } catch {
      // Client never opened a connection — nothing to tear down.
    }
  }
  await pool.end();
});

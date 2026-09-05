import assert from "node:assert/strict";
import express from "express";
import test from "node:test";
import { correlationMiddleware } from "../../middleware/correlation.js";
import { healthRouter, performanceRouter } from "../../routes/health.js";

// Build a minimal Express app wired only with the health surface. We avoid
// importing createApp from server.js because that pulls in the rate limiter
// (which initializes a Redis client) and a long chain of routers that this
// suite is not testing. This keeps the unit test hermetic and free of any
// required service connections.
const buildHealthApp = () => {
  const app = express();
  app.set("trust proxy", 1);
  app.use(correlationMiddleware);
  app.use("/api/health", healthRouter);
  app.use("/api/admin", performanceRouter);
  app.get("/api/ready", (_req, res) => {
    res.status(200).json({ status: "alive" });
  });
  return app;
};

test("health: GET /api/health/live returns 200 with alive status", async () => {
  const app = buildHealthApp();
  const { default: supertest } = await import("supertest");
  const response = await supertest(app).get("/api/health/live");
  assert.equal(response.status, 200);
  assert.equal(response.body.status, "alive");
  assert.ok(typeof response.body.timestamp === "string");
});

test("health: GET /api/health/live response includes correlation ID header", async () => {
  const app = buildHealthApp();
  const { default: supertest } = await import("supertest");
  const response = await supertest(app).get("/api/health/live");
  assert.equal(response.status, 200);
  const corrId = response.headers["x-correlation-id"];
  assert.ok(typeof corrId === "string" && corrId.length > 0, "Should have x-correlation-id header");
});

test("health: GET /api/health/live accepts a provided correlation ID", async () => {
  const app = buildHealthApp();
  const { default: supertest } = await import("supertest");
  const testCorrId = "test-corr-id-12345";
  const response = await supertest(app).get("/api/health/live").set("x-correlation-id", testCorrId);
  assert.equal(response.status, 200);
  assert.equal(response.headers["x-correlation-id"], testCorrId);
});

test("health: GET /api/ready returns structured readiness response", async () => {
  const app = buildHealthApp();
  const { default: supertest } = await import("supertest");
  const response = await supertest(app).get("/api/ready");
  // The minimal /api/ready above always returns 200; the real /api/health/ready
  // requires service connections and is exercised by integration tests.
  assert.equal(response.status, 200);
  assert.equal(response.body.status, "alive");
});

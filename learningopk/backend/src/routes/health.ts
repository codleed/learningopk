import { Router } from "express";

import { pool } from "../lib/db/index.js";
import { ensureRedisConnection, redis } from "../lib/redis.js";
import { env } from "../lib/env.js";
import { logger } from "../lib/logger.js";
import { getPerformanceStats } from "../lib/performance.js";
import { requireSession, type AuthenticatedRequest } from "../lib/session.js";
import { requireAdminRole } from "../lib/admin.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CheckStatus = "up" | "degraded" | "down";

interface CheckResult {
  status: CheckStatus;
  latencyMs: number;
  message?: string;
}

interface ReadinessResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  checks: {
    postgres: CheckResult;
    redis: CheckResult;
    minio: CheckResult;
    ai: CheckResult;
  };
}

// ---------------------------------------------------------------------------
// Individual checks
// ---------------------------------------------------------------------------

const checkPostgres = async (): Promise<CheckResult> => {
  const start = process.hrtime.bigint();
  try {
    await pool.query("SELECT 1");
    const latencyMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    return { status: "up", latencyMs: Math.round(latencyMs * 100) / 100 };
  } catch (error: unknown) {
    const latencyMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const message = error instanceof Error ? error.message : "Unknown PostgreSQL error";
    return { status: "down", latencyMs: Math.round(latencyMs * 100) / 100, message };
  }
};

const checkRedis = async (): Promise<CheckResult> => {
  const start = process.hrtime.bigint();
  try {
    await ensureRedisConnection();
    const pong = await redis.ping();
    const latencyMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    return {
      status: pong === "PONG" ? "up" : "degraded",
      latencyMs: Math.round(latencyMs * 100) / 100,
    };
  } catch (error: unknown) {
    const latencyMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const message = error instanceof Error ? error.message : "Unknown Redis error";
    return { status: "down", latencyMs: Math.round(latencyMs * 100) / 100, message };
  }
};

const checkMinio = async (): Promise<CheckResult> => {
  const start = process.hrtime.bigint();

  try {
    const { Client } = await import("minio");
    const client = new Client({
      endPoint: env.MINIO_ENDPOINT,
      port: Number(env.MINIO_PORT),
      useSSL: env.MINIO_USE_SSL === "true",
      accessKey: env.MINIO_ACCESS_KEY,
      secretKey: env.MINIO_SECRET_KEY,
    });
    const exists = await client.bucketExists(env.MINIO_BUCKET);
    const latencyMs = Math.round(Number(process.hrtime.bigint() - start) / 1_000_000 * 100) / 100;

    if (exists) {
      return { status: "up", latencyMs };
    }
    return { status: "degraded", latencyMs, message: "Bucket does not exist" };
  } catch (error: unknown) {
    const latencyMs = Math.round(Number(process.hrtime.bigint() - start) / 1_000_000 * 100) / 100;
    const message = error instanceof Error ? error.message : "Unknown MinIO error";
    return { status: "down", latencyMs, message };
  }
};

const checkAi = (): CheckResult => {
  // Lightweight check: verify that the Mistral API key is configured
  // (avoid making actual API calls in health checks)
  const apiKey = env.MISTRAL_API_KEY;
  if (!apiKey || apiKey === "not-configured") {
    return { status: "down", latencyMs: 0, message: "MISTRAL_API_KEY not configured" };
  }
  return { status: "up", latencyMs: 0 };
};

// ---------------------------------------------------------------------------
// Derive overall status
// ---------------------------------------------------------------------------

const deriveOverallStatus = (checks: ReadinessResponse["checks"]): ReadinessResponse["status"] => {
  const statuses = Object.values(checks).map((c) => c.status);
  if (statuses.every((s) => s === "up")) return "healthy";
  if (statuses.some((s) => s === "down")) return "unhealthy";
  return "degraded";
};

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const healthRouter = Router();

/**
 * GET /api/health/live
 * Simple liveness probe — if the process responds, it's alive.
 */
healthRouter.get("/live", (_req, res) => {
  res.status(200).json({ status: "alive", timestamp: new Date().toISOString() });
});

/**
 * GET /api/health/ready
 * Readiness probe — checks PostgreSQL, Redis, MinIO, and AI connectivity.
 */
healthRouter.get("/ready", async (_req, res) => {
  const [postgres, redisCheck, minio] = await Promise.all([
    checkPostgres(),
    checkRedis(),
    checkMinio(),
  ]);

  const ai = checkAi();

  const checks = { postgres, redis: redisCheck, minio, ai };
  const status = deriveOverallStatus(checks);

  const response: ReadinessResponse = {
    status,
    timestamp: new Date().toISOString(),
    checks,
  };

  const httpStatus = status === "unhealthy" ? 503 : 200;
  logger.info({ healthStatus: status, checks }, "Health check completed");
  res.status(httpStatus).json(response);
});

/**
 * GET /api/health
 * Backwards-compatible health endpoint (original behavior preserved).
 */
healthRouter.get("/", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    await ensureRedisConnection();
    const redisPing = await redis.ping();

    res.status(200).json({
      ok: true,
      postgres: "up",
      redis: redisPing === "PONG" ? "up" : "degraded",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown health error";
    res.status(503).json({
      ok: false,
      postgres: "down",
      redis: "down",
      error: message,
    });
  }
});

/**
 * GET /api/admin/performance
 * Returns performance stats (admin-only).
 * Note: This is mounted on the admin router path from server.ts,
 * so the full path is /api/admin/performance.
 */
export const performanceRouter = Router();

performanceRouter.get("/performance", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const stats = getPerformanceStats();
  res.status(200).json({
    timestamp: new Date().toISOString(),
    stats,
  });
});

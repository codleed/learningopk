import { Router } from "express";

import { pool } from "../lib/db/index.js";
import { ensureRedisConnection, redis } from "../lib/redis.js";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res) => {
  try {
    await pool.query("select 1");
    await ensureRedisConnection();
    const redisPing = await redis.ping();

    res.status(200).json({
      ok: true,
      postgres: "up",
      redis: redisPing === "PONG" ? "up" : "degraded"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown health error";
    res.status(503).json({
      ok: false,
      postgres: "down",
      redis: "down",
      error: message
    });
  }
});

import { pool } from "../lib/db/index.js";
import { ensureRedisConnection, redis } from "../lib/redis.js";

const run = async (): Promise<void> => {
  await pool.query("select 1");
  await ensureRedisConnection();
  const redisPing = await redis.ping();

  console.log("PostgreSQL: OK");
  console.log(`Redis: ${redisPing}`);

  await pool.end();
  if (redis.isOpen) {
    await redis.quit();
  }
};

run().catch(async (error) => {
  console.error("Service healthcheck failed:", error);
  await pool.end().catch(() => undefined);
  if (redis.isOpen) {
    await redis.quit().catch(() => undefined);
  }
  process.exitCode = 1;
});

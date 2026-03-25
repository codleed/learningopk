import { Client as MinioClient } from "minio";

import { env } from "../lib/env.js";
import { pool } from "../lib/db/index.js";
import { ensureRedisConnection, redis } from "../lib/redis.js";

const run = async (): Promise<void> => {
  await pool.query("select 1");
  await ensureRedisConnection();
  const redisPing = await redis.ping();

  const minio = new MinioClient({
    endPoint: env.MINIO_ENDPOINT,
    port: parseInt(env.MINIO_PORT, 10),
    useSSL: env.MINIO_USE_SSL === "true",
    accessKey: env.MINIO_ACCESS_KEY,
    secretKey: env.MINIO_SECRET_KEY
  });
  await minio.listBuckets();

  console.log("PostgreSQL: OK");
  console.log(`Redis: ${redisPing}`);
  console.log("MinIO: OK");

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

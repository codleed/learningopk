import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "../lib/db/schema.js";
import { clearDatabase } from "../lib/db/clear-database.js";

config();

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgresql://postgres:password@localhost:5433/learningo"
});

const db = drizzle(pool, { schema });

async function run(): Promise<void> {
  console.log("Clearing database...");
  await clearDatabase(db);
  console.log("Database cleared.");
  await pool.end();
}

run().catch(async (error) => {
  console.error("Failed to clear database:", error);
  await pool.end();
  process.exit(1);
});

import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: "./backend/.env" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required in backend/.env");
}

export default defineConfig({
  schema: ["./backend/src/lib/db/schema.ts", "./backend/src/lib/db/study-groups-schema.ts"],
  out: "./backend/drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL
  },
  strict: true,
  verbose: true
});

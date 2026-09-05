import { randomBytes } from "node:crypto";
import { db } from "../src/lib/db/index.js";
import { schools } from "../src/lib/db/schema.js";

async function main() {
  const name = process.argv[2] ?? "Demo School";
  const board = process.argv[3] ?? "punjab";
  const slug = name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 60);
  const inviteCode = "LPK-" + randomBytes(4).toString("hex").toUpperCase();

  const inserted = await db.insert(schools).values({ name, slug, board, inviteCode }).returning();
  console.log("Created school:", inserted[0]);
  process.exit(0);
}

main();

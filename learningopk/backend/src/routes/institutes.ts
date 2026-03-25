import { Router } from "express";
import { db } from "../lib/db/index.js";
import { institutes } from "../lib/db/schema.js";

export const institutesRouter = Router();

institutesRouter.get("/", async (_req, res) => {
  try {
    const allInstitutes = await db
      .select({
        id: institutes.id,
        name: institutes.name,
      })
      .from(institutes)
      .orderBy(institutes.name);

    res.json({ institutes: allInstitutes });
  } catch (error) {
    console.error("Get institutes error:", error);
    res.status(500).json({ error: "Failed to fetch institutes" });
  }
});
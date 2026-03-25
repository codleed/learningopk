import { Router } from "express";
import { db } from "../lib/db/index.js";
import { boardClasses } from "../lib/db/schema.js";
import { asc } from "drizzle-orm";

export const classesRouter = Router();

classesRouter.get("/", async (_req, res) => {
  try {
    const allClasses = await db
      .select({
        id: boardClasses.id,
        boardId: boardClasses.boardId,
        name: boardClasses.name,
        slug: boardClasses.slug,
      })
      .from(boardClasses)
      .orderBy(asc(boardClasses.name));

    res.json({ classes: allClasses });
  } catch (error) {
    console.error("Get classes error:", error);
    res.status(500).json({ error: "Failed to fetch classes" });
  }
});
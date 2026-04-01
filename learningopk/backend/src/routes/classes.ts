import { Router } from "express";
import { db } from "../lib/db/index.js";
import { boardClasses } from "../lib/db/schema.js";
import { asc } from "drizzle-orm";
import { errorResponse, successResponse } from "../lib/response.js";

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

    res.json(successResponse({ classes: allClasses }));
  } catch (error) {
    console.error("Get classes error:", error);
    res.status(500).json(errorResponse("Failed to fetch classes", "FETCH_ERROR"));
  }
});
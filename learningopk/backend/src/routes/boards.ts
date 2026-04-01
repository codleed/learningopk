import { Router } from "express";
import { db } from "../lib/db/index.js";
import { boards } from "../lib/db/schema.js";
import { asc } from "drizzle-orm";
import { errorResponse, successResponse } from "../lib/response.js";

export const boardsRouter = Router();

boardsRouter.get("/", async (_req, res) => {
  try {
    const allBoards = await db
      .select({
        id: boards.id,
        name: boards.name,
        slug: boards.slug,
      })
      .from(boards)
      .orderBy(asc(boards.name));

    res.json(successResponse({ boards: allBoards }));
  } catch (error) {
    console.error("Get boards error:", error);
    res.status(500).json(errorResponse("Failed to fetch boards", "FETCH_ERROR"));
  }
});
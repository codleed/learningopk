import { Router } from "express";
import { db } from "../lib/db/index.js";
import { subjects } from "../lib/db/schema.js";
import { asc } from "drizzle-orm";

export const subjectsRouter = Router();

subjectsRouter.get("/", async (_req, res) => {
  try {
    const allSubjects = await db
      .select({
        id: subjects.id,
        boardId: subjects.boardId,
        grade: subjects.grade,
        name: subjects.name,
        slug: subjects.slug,
        icon: subjects.icon,
        description: subjects.description,
      })
      .from(subjects)
      .orderBy(asc(subjects.name));

    res.json({ subjects: allSubjects });
  } catch (error) {
    console.error("Get subjects error:", error);
    res.status(500).json({ error: "Failed to fetch subjects" });
  }
});
import { Router } from "express";
import { z } from "zod";
import { desc, eq, and, sql, ilike } from "drizzle-orm";

import { requireSession, type AuthenticatedRequest } from "../lib/session.js";
import { db } from "../lib/db/index.js";
import { studentNotes, subjects, chapters } from "../lib/db/schema.js";
import { successResponse, errorResponse, noContentResponse } from "../lib/response.js";

const numericStringSchema = z.coerce.number().int().positive();

const notesQuerySchema = z.object({
  subjectId: z.preprocess(
    (value) => (value === undefined || value === "" ? undefined : value),
    numericStringSchema.optional()
  ),
  chapterId: z.preprocess(
    (value) => (value === undefined || value === "" ? undefined : value),
    numericStringSchema.optional()
  ),
  q: z.string().trim().max(200).optional().default("")
});

const createNoteSchema = z.object({
  title: z.string().trim().min(1).max(500),
  content: z.string().min(1).max(50000),
  subjectId: z.number().int().positive().nullable().optional(),
  chapterId: z.number().int().positive().nullable().optional(),
  tags: z.array(z.string().trim().max(50)).max(20).optional().default([])
});

const updateNoteSchema = z.object({
  title: z.string().trim().min(1).max(500).optional(),
  content: z.string().min(1).max(50000).optional(),
  subjectId: z.number().int().positive().nullable().optional(),
  chapterId: z.number().int().positive().nullable().optional(),
  tags: z.array(z.string().trim().max(50)).max(20).optional()
});

const noteIdParamSchema = z.object({
  id: numericStringSchema
});

export const notesRouter = Router();

// GET /api/notes - list user's notes
notesRouter.get("/", requireSession, async (req, res) => {
  const parsed = notesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json(errorResponse("Invalid query parameters", "VALIDATION_ERROR", parsed.error.flatten()));
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  const userId = authedReq.session.user.id;
  const { subjectId, chapterId, q } = parsed.data;

  try {
    const conditions = [eq(studentNotes.userId, userId)];

    if (subjectId !== undefined) {
      conditions.push(eq(studentNotes.subjectId, subjectId));
    }
    if (chapterId !== undefined) {
      conditions.push(eq(studentNotes.chapterId, chapterId));
    }
    if (q) {
      conditions.push(
        sql`to_tsvector('english', coalesce(${studentNotes.title}, '') || ' ' || coalesce(${studentNotes.content}, '')) @@ plainto_tsquery('english', ${q})`
      );
    }

    const rows = await db
      .select({
        id: studentNotes.id,
        title: studentNotes.title,
        content: studentNotes.content,
        subjectId: studentNotes.subjectId,
        chapterId: studentNotes.chapterId,
        tags: studentNotes.tags,
        createdAt: studentNotes.createdAt,
        updatedAt: studentNotes.updatedAt,
        subjectName: subjects.name,
        chapterTitle: chapters.title
      })
      .from(studentNotes)
      .leftJoin(subjects, eq(studentNotes.subjectId, subjects.id))
      .leftJoin(chapters, eq(studentNotes.chapterId, chapters.id))
      .where(and(...conditions))
      .orderBy(desc(studentNotes.updatedAt));

    res.json(successResponse(rows));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json(errorResponse(message, "INTERNAL_ERROR"));
  }
});

// POST /api/notes - create a note
notesRouter.post("/", requireSession, async (req, res) => {
  const parsed = createNoteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(errorResponse("Invalid note data", "VALIDATION_ERROR", parsed.error.flatten()));
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  const userId = authedReq.session.user.id;

  try {
    const [note] = await db
      .insert(studentNotes)
      .values({
        userId,
        title: parsed.data.title,
        content: parsed.data.content,
        subjectId: parsed.data.subjectId ?? null,
        chapterId: parsed.data.chapterId ?? null,
        tags: parsed.data.tags
      })
      .returning();

    res.status(201).json(successResponse(note));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json(errorResponse(message, "INTERNAL_ERROR"));
  }
});

// PUT /api/notes/:id - update a note
notesRouter.put("/:id", requireSession, async (req, res) => {
  const params = noteIdParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json(errorResponse("Invalid note id", "VALIDATION_ERROR", params.error.flatten()));
    return;
  }

  const parsed = updateNoteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(errorResponse("Invalid note data", "VALIDATION_ERROR", parsed.error.flatten()));
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  const userId = authedReq.session.user.id;

  try {
    // Verify ownership
    const existing = await db
      .select({ id: studentNotes.id })
      .from(studentNotes)
      .where(and(eq(studentNotes.id, params.data.id), eq(studentNotes.userId, userId)))
      .limit(1);

    if (existing.length === 0) {
      res.status(404).json(errorResponse("Note not found", "NOT_FOUND"));
      return;
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date()
    };

    if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
    if (parsed.data.content !== undefined) updateData.content = parsed.data.content;
    if (parsed.data.tags !== undefined) updateData.tags = parsed.data.tags;
    if ("subjectId" in parsed.data) updateData.subjectId = parsed.data.subjectId ?? null;
    if ("chapterId" in parsed.data) updateData.chapterId = parsed.data.chapterId ?? null;

    const [updated] = await db
      .update(studentNotes)
      .set(updateData)
      .where(and(eq(studentNotes.id, params.data.id), eq(studentNotes.userId, userId)))
      .returning();

    res.json(successResponse(updated));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json(errorResponse(message, "INTERNAL_ERROR"));
  }
});

// DELETE /api/notes/:id - delete a note
notesRouter.delete("/:id", requireSession, async (req, res) => {
  const params = noteIdParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json(errorResponse("Invalid note id", "VALIDATION_ERROR", params.error.flatten()));
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  const userId = authedReq.session.user.id;

  try {
    const deleted = await db
      .delete(studentNotes)
      .where(and(eq(studentNotes.id, params.data.id), eq(studentNotes.userId, userId)))
      .returning({ id: studentNotes.id });

    if (deleted.length === 0) {
      res.status(404).json(errorResponse("Note not found", "NOT_FOUND"));
      return;
    }

    res.json(noContentResponse());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json(errorResponse(message, "INTERNAL_ERROR"));
  }
});

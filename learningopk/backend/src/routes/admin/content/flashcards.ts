import { asc, eq, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { requireAdminRole } from "../../../lib/admin.js";
import { CacheKeys, cacheService } from "../../../lib/cache/cache.service.js";
import { db } from "../../../lib/db/index.js";
import { flashcards } from "../../../lib/db/schema.js";
import { requireSession, type AuthenticatedRequest } from "../../../lib/session.js";
import { persistAuditLog, type AdminAuditScope } from "../shared.js";

export const flashcardsAdminRouter = Router();

// Flashcard schemas
const flashcardCreateBodySchema = z.object({
  chapterId: z.coerce.number().int().positive(),
  front: z.string().trim().min(1),
  back: z.string().trim().min(1),
  orderIndex: z.coerce.number().int().min(0).optional(),
});

const flashcardUpdateBodySchema = z.object({
  front: z.string().trim().min(1).optional(),
  back: z.string().trim().min(1).optional(),
});

const flashcardListQuerySchema = z.object({
  chapterId: z.coerce.number().int().positive(),
});

const flashcardParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const flashcardReorderBodySchema = z.object({
  chapterId: z.coerce.number().int().positive(),
  orderedIds: z.array(z.coerce.number().int().positive()).min(1),
});

/**
 * POST /api/admin/content/flashcards - Create flashcard
 * If orderIndex not provided, appends to end of chapter's flashcards
 */
flashcardsAdminRouter.post("/content/flashcards", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedBody = flashcardCreateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid flashcard payload",
      details: parsedBody.error.flatten(),
    });
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;

  // Determine orderIndex: if not provided, append to end
  let orderIndex = parsedBody.data.orderIndex;
  if (orderIndex === undefined) {
    const maxOrderResult = await db
      .select({
        maxOrder: sql<number>`coalesce(max(${flashcards.orderIndex}), -1)::int`,
      })
      .from(flashcards)
      .where(eq(flashcards.chapterId, parsedBody.data.chapterId));
    orderIndex = (maxOrderResult[0]?.maxOrder ?? -1) + 1;
  }

  const insertedRows = await db
    .insert(flashcards)
    .values({
      chapterId: parsedBody.data.chapterId,
      front: parsedBody.data.front.trim(),
      back: parsedBody.data.back.trim(),
      orderIndex,
    })
    .returning({
      id: flashcards.id,
      chapterId: flashcards.chapterId,
      front: flashcards.front,
      back: flashcards.back,
      orderIndex: flashcards.orderIndex,
    });

  const newFlashcard = insertedRows[0];
  if (!newFlashcard) {
    await persistAuditLog({
      scope: "content",
      action: "Create flashcard",
      target: `Chapter #${parsedBody.data.chapterId}`,
      status: "failed",
      message: "Flashcard creation failed",
      actorId,
      actorName,
    });
    res.status(500).json({ error: "Failed to create flashcard" });
    return;
  }

  // Invalidate chapter content cache (flashcards are part of chapter content)
  await cacheService.delete(CacheKeys.chapterContent(newFlashcard.chapterId));

  await persistAuditLog({
    scope: "content",
    action: "Create flashcard",
    target: `Flashcard #${newFlashcard.id}`,
    status: "success",
    message: `Created flashcard for chapter ${newFlashcard.chapterId}`,
    actorId,
    actorName,
  });

  res.status(201).json({
    data: newFlashcard,
  });
});

/**
 * GET /api/admin/content/flashcards?chapterId=N - List flashcards for chapter
 * Ordered by orderIndex ASC
 */
flashcardsAdminRouter.get("/content/flashcards", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedQuery = flashcardListQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({
      error: "Invalid flashcard query",
      details: parsedQuery.error.flatten(),
    });
    return;
  }

  if (!parsedQuery.data.chapterId) {
    res.status(400).json({
      error: "chapterId is required",
    });
    return;
  }

  const flashcardRows = await db
    .select({
      id: flashcards.id,
      chapterId: flashcards.chapterId,
      front: flashcards.front,
      back: flashcards.back,
      orderIndex: flashcards.orderIndex,
    })
    .from(flashcards)
    .where(eq(flashcards.chapterId, parsedQuery.data.chapterId))
    .orderBy(asc(flashcards.orderIndex));

  res.status(200).json({
    data: flashcardRows,
    total: flashcardRows.length,
  });
});

/**
 * POST /api/admin/content/flashcards/:id/update - Update flashcard
 */
flashcardsAdminRouter.post("/content/flashcards/:id/update", requireSession, async (req, res) => {
  const parsedParams = flashcardParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid flashcard identifier",
      details: parsedParams.error.flatten(),
    });
    return;
  }

  const parsedBody = flashcardUpdateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid flashcard payload",
      details: parsedBody.error.flatten(),
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;

  // Check if flashcard exists
  const flashcardRows = await db
    .select({
      id: flashcards.id,
      chapterId: flashcards.chapterId,
      front: flashcards.front,
      back: flashcards.back,
      orderIndex: flashcards.orderIndex,
    })
    .from(flashcards)
    .where(eq(flashcards.id, parsedParams.data.id))
    .limit(1);

  const existingFlashcard = flashcardRows[0];
  if (!existingFlashcard) {
    await persistAuditLog({
      scope: "content",
      action: "Update flashcard",
      target: `Flashcard #${parsedParams.data.id}`,
      status: "failed",
      message: "Flashcard not found",
      actorId,
      actorName,
    });
    res.status(404).json({ error: "Flashcard not found" });
    return;
  }

  const updatedRows = await db
    .update(flashcards)
    .set({
      ...(parsedBody.data.front !== undefined && { front: parsedBody.data.front.trim() }),
      ...(parsedBody.data.back !== undefined && { back: parsedBody.data.back.trim() }),
    })
    .where(eq(flashcards.id, existingFlashcard.id))
    .returning({
      id: flashcards.id,
      chapterId: flashcards.chapterId,
      front: flashcards.front,
      back: flashcards.back,
      orderIndex: flashcards.orderIndex,
    });

  const updatedFlashcard = updatedRows[0];
  if (!updatedFlashcard) {
    await persistAuditLog({
      scope: "content",
      action: "Update flashcard",
      target: `Flashcard #${existingFlashcard.id}`,
      status: "failed",
      message: "Flashcard update failed",
      actorId,
      actorName,
    });
    res.status(500).json({ error: "Failed to update flashcard" });
    return;
  }

  // Invalidate chapter content cache (flashcards are part of chapter content)
  await cacheService.delete(CacheKeys.chapterContent(updatedFlashcard.chapterId));

  await persistAuditLog({
    scope: "content",
    action: "Update flashcard",
    target: `Flashcard #${updatedFlashcard.id}`,
    status: "success",
    message: `Updated flashcard for chapter ${updatedFlashcard.chapterId}`,
    actorId,
    actorName,
  });

  res.status(200).json({
    data: updatedFlashcard,
  });
});

/**
 * POST /api/admin/content/flashcards/:id/delete - Delete flashcard
 */
flashcardsAdminRouter.post("/content/flashcards/:id/delete", requireSession, async (req, res) => {
  const parsedParams = flashcardParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid flashcard identifier",
      details: parsedParams.error.flatten(),
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;

  const flashcardRows = await db
    .select({
      id: flashcards.id,
      chapterId: flashcards.chapterId,
    })
    .from(flashcards)
    .where(eq(flashcards.id, parsedParams.data.id))
    .limit(1);

  const flashcard = flashcardRows[0];
  if (!flashcard) {
    await persistAuditLog({
      scope: "content",
      action: "Delete flashcard",
      target: `Flashcard #${parsedParams.data.id}`,
      status: "failed",
      message: "Flashcard not found",
      actorId,
      actorName,
    });
    res.status(404).json({ error: "Flashcard not found" });
    return;
  }

  await db.delete(flashcards).where(eq(flashcards.id, flashcard.id));

  // Invalidate chapter content cache (flashcards are part of chapter content)
  await cacheService.delete(CacheKeys.chapterContent(flashcard.chapterId));

  await persistAuditLog({
    scope: "content",
    action: "Delete flashcard",
    target: `Flashcard #${flashcard.id} from chapter ${flashcard.chapterId}`,
    status: "success",
    message: "Deleted flashcard",
    actorId,
    actorName,
  });

  res.status(200).json({
    success: true,
    deletedId: flashcard.id,
  });
});

/**
 * POST /api/admin/content/flashcards/reorder - Reorder flashcards
 * Validates that orderedIds contains ALL flashcard IDs for the chapter
 */
flashcardsAdminRouter.post("/content/flashcards/reorder", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedBody = flashcardReorderBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid reorder payload",
      details: parsedBody.error.flatten(),
    });
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;
  const { chapterId, orderedIds } = parsedBody.data;

  // Fetch all existing flashcards for this chapter
  const existingFlashcards = await db
    .select({ id: flashcards.id })
    .from(flashcards)
    .where(eq(flashcards.chapterId, chapterId));

  const existingIds = new Set(existingFlashcards.map((f) => f.id));
  const providedIds = new Set(orderedIds);

  // Validate no duplicates in orderedIds
  if (new Set(orderedIds).size !== orderedIds.length) {
    res.status(400).json({
      error: "orderedIds contains duplicate values",
    });
    return;
  }

  // Validate that orderedIds contains ALL flashcards for this chapter
  if (
    existingIds.size !== providedIds.size ||
    ![...existingIds].every((id) => providedIds.has(id))
  ) {
    res.status(400).json({
      error: "orderedIds must contain exactly all flashcard IDs for the chapter",
      details: {
        existingIds: [...existingIds],
        providedIds,
      },
    });
    return;
  }

  // Update orderIndex for each flashcard in a transaction
  const updatedFlashcards: { id: number; orderIndex: number }[] = [];

  try {
    await db.transaction(async (tx) => {
      for (let i = 0; i < orderedIds.length; i++) {
        const flashcardId = orderedIds[i]!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
        const newOrderIndex = i;

        await tx
          .update(flashcards)
          .set({ orderIndex: newOrderIndex })
          .where(eq(flashcards.id, flashcardId));

        updatedFlashcards.push({ id: flashcardId, orderIndex: newOrderIndex });
      }
    });
  } catch (error) {
    await persistAuditLog({
      scope: "content",
      action: "Reorder flashcards",
      target: `Chapter #${chapterId}`,
      status: "failed",
      message: error instanceof Error ? error.message : "Reorder failed",
      actorId,
      actorName,
    });
    res.status(500).json({ error: "Failed to reorder flashcards" });
    return;
  }

  // Invalidate chapter content cache (flashcard order is part of chapter content)
  await cacheService.delete(CacheKeys.chapterContent(chapterId));

  await persistAuditLog({
    scope: "content",
    action: "Reorder flashcards",
    target: `Chapter #${chapterId}`,
    status: "success",
    message: `Reordered ${updatedFlashcards.length} flashcards`,
    actorId,
    actorName,
  });

  res.status(200).json({
    success: true,
    updated: updatedFlashcards,
  });
});

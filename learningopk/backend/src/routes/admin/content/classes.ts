import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { requireAdminRole } from "../../../lib/admin.js";
import { CacheKeys, cacheService } from "../../../lib/cache/cache.service.js";
import { db } from "../../../lib/db/index.js";
import { boardClasses, boards, subjects } from "../../../lib/db/schema.js";
import { requireSession, type AuthenticatedRequest } from "../../../lib/session.js";
import { persistAuditLog, type AdminAuditScope } from "../shared.js";

const curriculumEntityParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const curriculumClassCreateBodySchema = z.object({
  boardId: z.coerce.number().int().positive(),
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
});

const curriculumClassUpdateBodySchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
});

export const classesAdminRouter = Router();

classesAdminRouter.post("/content/classes", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedBody = curriculumClassCreateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid class payload",
      details: parsedBody.error.flatten(),
    });
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;
  const name = parsedBody.data.name.trim();
  const slug = parsedBody.data.slug.trim().toLowerCase();

  const boardRows = await db
    .select({
      id: boards.id,
      name: boards.name,
    })
    .from(boards)
    .where(eq(boards.id, parsedBody.data.boardId))
    .limit(1);

  const board = boardRows[0];
  if (!board) {
    await persistAuditLog({
      scope: "content",
      action: "Create class",
      target: `${name} (${slug})`,
      status: "failed",
      message: "Board not found",
      actorId,
      actorName,
    });
    res.status(404).json({
      error: "Board not found",
    });
    return;
  }

  try {
    const insertedRows = await db
      .insert(boardClasses)
      .values({
        boardId: board.id,
        name,
        slug,
      })
      .returning({
        id: boardClasses.id,
        boardId: boardClasses.boardId,
        name: boardClasses.name,
        slug: boardClasses.slug,
      });

    const boardClass = insertedRows[0];
    if (!boardClass) {
      res.status(500).json({
        error: "Failed to create class",
      });
      return;
    }

    await persistAuditLog({
      scope: "content",
      action: "Create class",
      target: `${board.name} / ${boardClass.name}`,
      status: "success",
      message: `Created class ${boardClass.slug}`,
      actorId,
      actorName,
    });

    // Purge cached curriculum data
    void cacheService.invalidatePattern("learn:*");

    res.status(201).json({
      class: boardClass,
    });
  } catch {
    await persistAuditLog({
      scope: "content",
      action: "Create class",
      target: `${board.name} / ${name}`,
      status: "failed",
      message: "Class create failed",
      actorId,
      actorName,
    });
    res.status(409).json({
      error: "Class already exists for board",
    });
  }
});

classesAdminRouter.post("/content/classes/:id/update", requireSession, async (req, res) => {
  const parsedParams = curriculumEntityParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid class identifier",
      details: parsedParams.error.flatten(),
    });
    return;
  }

  const parsedBody = curriculumClassUpdateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid class payload",
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
  const action = "Update class";
  const fallbackTarget = `Class #${parsedParams.data.id}`;

  const classRows = await db
    .select({
      id: boardClasses.id,
      boardId: boardClasses.boardId,
      name: boardClasses.name,
      slug: boardClasses.slug,
      boardName: boards.name,
    })
    .from(boardClasses)
    .innerJoin(boards, eq(boardClasses.boardId, boards.id))
    .where(eq(boardClasses.id, parsedParams.data.id))
    .limit(1);
  const boardClass = classRows[0];
  if (!boardClass) {
    await persistAuditLog({
      scope: "content",
      action,
      target: fallbackTarget,
      status: "failed",
      message: "Class not found",
      actorId,
      actorName,
    });
    res.status(404).json({
      error: "Class not found",
    });
    return;
  }

  try {
    const updatedRows = await db
      .update(boardClasses)
      .set({
        name: parsedBody.data.name.trim(),
        slug: parsedBody.data.slug.trim().toLowerCase(),
      })
      .where(eq(boardClasses.id, boardClass.id))
      .returning({
        id: boardClasses.id,
        boardId: boardClasses.boardId,
        name: boardClasses.name,
        slug: boardClasses.slug,
      });
    const updatedClass = updatedRows[0];
    if (!updatedClass) {
      await persistAuditLog({
        scope: "content",
        action,
        target: `${boardClass.boardName} / ${boardClass.name}`,
        status: "failed",
        message: "Class not found",
        actorId,
        actorName,
      });
      res.status(404).json({
        error: "Class not found",
      });
      return;
    }

    await persistAuditLog({
      scope: "content",
      action,
      target: `${boardClass.boardName} / ${boardClass.name}`,
      status: "success",
      message: `Updated class to ${updatedClass.slug}`,
      actorId,
      actorName,
    });

    // Purge cached curriculum data
    void cacheService.invalidatePattern("learn:*");

    res.status(200).json({
      class: updatedClass,
      timestamp: new Date().toISOString(),
    });
  } catch {
    await persistAuditLog({
      scope: "content",
      action,
      target: `${boardClass.boardName} / ${boardClass.name}`,
      status: "failed",
      message: "Class update failed",
      actorId,
      actorName,
    });
    res.status(409).json({
      error: "Class already exists for board",
    });
  }
});

classesAdminRouter.post("/content/classes/:id/delete", requireSession, async (req, res) => {
  const parsedParams = curriculumEntityParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid class identifier",
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
  const action = "Delete class";
  const fallbackTarget = `Class #${parsedParams.data.id}`;

  const classRows = await db
    .select({
      id: boardClasses.id,
      boardId: boardClasses.boardId,
      name: boardClasses.name,
      slug: boardClasses.slug,
      boardName: boards.name,
    })
    .from(boardClasses)
    .innerJoin(boards, eq(boardClasses.boardId, boards.id))
    .where(eq(boardClasses.id, parsedParams.data.id))
    .limit(1);
  const boardClass = classRows[0];
  if (!boardClass) {
    await persistAuditLog({
      scope: "content",
      action,
      target: fallbackTarget,
      status: "failed",
      message: "Class not found",
      actorId,
      actorName,
    });
    res.status(404).json({
      error: "Class not found",
    });
    return;
  }

  try {
    await db.transaction(async (tx) => {
      await tx.delete(subjects).where(eq(subjects.boardClassId, boardClass.id));
      await tx.delete(boardClasses).where(eq(boardClasses.id, boardClass.id));
    });
  } catch (error) {
    await persistAuditLog({
      scope: "content",
      action,
      target: `${boardClass.boardName} / ${boardClass.name}`,
      status: "failed",
      message: error instanceof Error ? error.message : "Class delete failed",
      actorId,
      actorName,
    });
    res.status(500).json({ error: "Failed to delete class" });
    return;
  }

  await persistAuditLog({
    scope: "content",
    action,
    target: `${boardClass.boardName} / ${boardClass.name}`,
    status: "success",
    message: `Deleted class ${boardClass.slug}`,
    actorId,
    actorName,
  });

  // Purge cached curriculum data
  void cacheService.invalidatePattern("learn:*");
  void cacheService.delete(CacheKeys.subjectList());
  void cacheService.invalidatePattern("chapters:list:*");

  res.status(200).json({
    class: {
      id: boardClass.id,
      boardId: boardClass.boardId,
      name: boardClass.name,
      slug: boardClass.slug,
    },
    timestamp: new Date().toISOString(),
  });
});

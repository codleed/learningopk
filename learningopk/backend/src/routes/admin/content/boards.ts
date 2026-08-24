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

const curriculumBoardCreateBodySchema = z.object({
  name: z.string().trim().min(2),
  slug: z.string().trim().min(2),
});

const curriculumBoardUpdateBodySchema = z.object({
  name: z.string().trim().min(2),
  slug: z.string().trim().min(2),
});

export const boardsAdminRouter = Router();

boardsAdminRouter.post("/content/boards", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedBody = curriculumBoardCreateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid board payload",
      details: parsedBody.error.flatten(),
    });
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;
  const name = parsedBody.data.name.trim();
  const slug = parsedBody.data.slug.trim().toLowerCase();

  try {
    const insertedRows = await db
      .insert(boards)
      .values({
        name,
        slug,
      })
      .returning({
        id: boards.id,
        name: boards.name,
        slug: boards.slug,
      });

    const board = insertedRows[0];
    if (!board) {
      res.status(500).json({
        error: "Failed to create board",
      });
      return;
    }

    await persistAuditLog({
      scope: "content",
      action: "Create board",
      target: board.name,
      status: "success",
      message: `Created board ${board.slug}`,
      actorId,
      actorName,
    });

    // Purge cached curriculum data
    void cacheService.invalidatePattern("learn:*");
    void cacheService.delete(CacheKeys.subjectList());

    res.status(201).json({
      board,
    });
  } catch {
    await persistAuditLog({
      scope: "content",
      action: "Create board",
      target: name,
      status: "failed",
      message: "Board create failed",
      actorId,
      actorName,
    });
    res.status(409).json({
      error: "Board already exists",
    });
  }
});

boardsAdminRouter.post("/content/boards/:id/update", requireSession, async (req, res) => {
  const parsedParams = curriculumEntityParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid board identifier",
      details: parsedParams.error.flatten(),
    });
    return;
  }

  const parsedBody = curriculumBoardUpdateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid board payload",
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
  const action = "Update board";
  const fallbackTarget = `Board #${parsedParams.data.id}`;

  const boardRows = await db
    .select({
      id: boards.id,
      name: boards.name,
      slug: boards.slug,
    })
    .from(boards)
    .where(eq(boards.id, parsedParams.data.id))
    .limit(1);
  const board = boardRows[0];
  if (!board) {
    await persistAuditLog({
      scope: "content",
      action,
      target: fallbackTarget,
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
    const updatedRows = await db
      .update(boards)
      .set({
        name: parsedBody.data.name.trim(),
        slug: parsedBody.data.slug.trim().toLowerCase(),
      })
      .where(eq(boards.id, board.id))
      .returning({
        id: boards.id,
        name: boards.name,
        slug: boards.slug,
      });
    const updatedBoard = updatedRows[0];
    if (!updatedBoard) {
      await persistAuditLog({
        scope: "content",
        action,
        target: board.name,
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

    await persistAuditLog({
      scope: "content",
      action,
      target: board.name,
      status: "success",
      message: `Updated board to ${updatedBoard.slug}`,
      actorId,
      actorName,
    });

    // Purge cached curriculum data
    void cacheService.invalidatePattern("learn:*");
    void cacheService.delete(CacheKeys.subjectList());

    res.status(200).json({
      board: updatedBoard,
      timestamp: new Date().toISOString(),
    });
  } catch {
    await persistAuditLog({
      scope: "content",
      action,
      target: board.name,
      status: "failed",
      message: "Board update failed",
      actorId,
      actorName,
    });
    res.status(409).json({
      error: "Board already exists",
    });
  }
});

boardsAdminRouter.post("/content/boards/:id/delete", requireSession, async (req, res) => {
  const parsedParams = curriculumEntityParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid board identifier",
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
  const action = "Delete board";
  const fallbackTarget = `Board #${parsedParams.data.id}`;

  const boardRows = await db
    .select({
      id: boards.id,
      name: boards.name,
      slug: boards.slug,
    })
    .from(boards)
    .where(eq(boards.id, parsedParams.data.id))
    .limit(1);
  const board = boardRows[0];
  if (!board) {
    await persistAuditLog({
      scope: "content",
      action,
      target: fallbackTarget,
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
    await db.transaction(async (tx) => {
      await tx.delete(subjects).where(eq(subjects.boardId, board.id));
      await tx.delete(boardClasses).where(eq(boardClasses.boardId, board.id));
      await tx.delete(boards).where(eq(boards.id, board.id));
    });
  } catch (error) {
    await persistAuditLog({
      scope: "content",
      action,
      target: board.name,
      status: "failed",
      message: error instanceof Error ? error.message : "Board delete failed",
      actorId,
      actorName,
    });
    res.status(500).json({ error: "Failed to delete board" });
    return;
  }

  await persistAuditLog({
    scope: "content",
    action,
    target: board.name,
    status: "success",
    message: `Deleted board ${board.slug}`,
    actorId,
    actorName,
  });

  // Purge cached curriculum data
  void cacheService.invalidatePattern("learn:*");
  void cacheService.delete(CacheKeys.subjectList());
  void cacheService.invalidatePattern("chapters:list:*");

  res.status(200).json({
    board,
    timestamp: new Date().toISOString(),
  });
});

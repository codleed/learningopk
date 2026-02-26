import { and, asc, desc, eq, sql } from "drizzle-orm";
import { Router, type Response } from "express";
import { z } from "zod";

import { requireAdminRole } from "../lib/admin.js";
import { db } from "../lib/db/index.js";
import { adminAuditLogs, boards, chapters, forumThreads, moderationFlags, subjects } from "../lib/db/schema.js";
import { requireSession, type AuthenticatedRequest } from "../lib/session.js";

const chapterParamsSchema = z.object({
  id: z.coerce.number().int().positive()
});

const threadParamsSchema = z.object({
  threadId: z.string().uuid()
});

const chapterPublishBodySchema = z.object({
  isPublished: z.boolean()
});

const threadPinBodySchema = z.object({
  isPinned: z.boolean()
});

const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20)
});

const moderationFlagQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z.enum(["open", "resolved"]).optional().default("open"),
  targetType: z.enum(["thread", "reply", "chapter"]).optional()
});

const moderationFlagResolveParamsSchema = z.object({
  id: z.string().uuid()
});

const moderationFlagResolveBodySchema = z.object({
  note: z.string().trim().min(10)
});

type AdminAuditScope = "content" | "forum" | "moderation";

type PersistAuditLogInput = {
  scope: AdminAuditScope;
  action: string;
  target: string;
  status: "success" | "failed";
  message: string;
  actorId: string;
  actorName: string;
};

const persistAuditLog = async (input: PersistAuditLogInput): Promise<void> => {
  await db.insert(adminAuditLogs).values({
    scope: input.scope,
    action: input.action,
    target: input.target,
    status: input.status,
    message: input.message,
    actorId: input.actorId,
    actorName: input.actorName
  });
};

const listAuditLogs = async (scope: AdminAuditScope, page: number, pageSize: number) => {
  const offset = (page - 1) * pageSize;

  const rows = await db
    .select({
      id: adminAuditLogs.id,
      action: adminAuditLogs.action,
      target: adminAuditLogs.target,
      status: adminAuditLogs.status,
      message: adminAuditLogs.message,
      actorId: adminAuditLogs.actorId,
      actorName: adminAuditLogs.actorName,
      createdAt: adminAuditLogs.createdAt
    })
    .from(adminAuditLogs)
    .where(eq(adminAuditLogs.scope, scope))
    .orderBy(desc(adminAuditLogs.createdAt), desc(adminAuditLogs.id))
    .offset(offset)
    .limit(pageSize);

  const totalRows = await db
    .select({
      count: sql<number>`count(*)::int`
    })
    .from(adminAuditLogs)
    .where(eq(adminAuditLogs.scope, scope));

  const total = totalRows[0]?.count ?? 0;

  return {
    entries: rows.map((row) => ({
      id: row.id,
      action: row.action,
      target: row.target,
      status: row.status,
      message: row.message,
      actor: {
        id: row.actorId,
        name: row.actorName
      },
      occurredAt: row.createdAt.toISOString()
    })),
    total,
    hasMore: offset + rows.length < total
  };
};

const handleAuditLogRead = async (req: AuthenticatedRequest, res: Response, scope: AdminAuditScope) => {
  if (!(await requireAdminRole(req, res))) {
    return;
  }

  const parsedQuery = auditLogQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({
      error: "Invalid audit log query parameters",
      details: parsedQuery.error.flatten()
    });
    return;
  }

  const { page, pageSize } = parsedQuery.data;
  const payload = await listAuditLogs(scope, page, pageSize);

  res.status(200).json({
    entries: payload.entries,
    total: payload.total,
    page,
    pageSize,
    hasMore: payload.hasMore
  });
};

const listModerationFlags = async ({
  page,
  pageSize,
  status,
  targetType
}: {
  page: number;
  pageSize: number;
  status: "open" | "resolved";
  targetType?: "thread" | "reply" | "chapter";
}) => {
  const offset = (page - 1) * pageSize;
  const predicates = [eq(moderationFlags.status, status)];
  if (targetType) {
    predicates.push(eq(moderationFlags.targetType, targetType));
  }

  const whereClause = predicates.length > 1 ? and(...predicates) : predicates[0];

  const rows = await db
    .select({
      id: moderationFlags.id,
      createdAt: moderationFlags.createdAt,
      targetType: moderationFlags.targetType,
      targetId: moderationFlags.targetId,
      targetLabel: moderationFlags.targetLabel,
      reason: moderationFlags.reason,
      status: moderationFlags.status,
      resolvedBy: moderationFlags.resolvedBy,
      resolvedAt: moderationFlags.resolvedAt,
      resolutionNote: moderationFlags.resolutionNote
    })
    .from(moderationFlags)
    .where(whereClause)
    .orderBy(desc(moderationFlags.createdAt), desc(moderationFlags.id))
    .offset(offset)
    .limit(pageSize);

  const totalRows = await db
    .select({
      count: sql<number>`count(*)::int`
    })
    .from(moderationFlags)
    .where(whereClause);
  const total = totalRows[0]?.count ?? 0;

  return {
    entries: rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      targetType: row.targetType,
      targetId: row.targetId,
      targetLabel: row.targetLabel,
      reason: row.reason,
      status: row.status,
      resolvedBy: row.resolvedBy,
      resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
      resolutionNote: row.resolutionNote
    })),
    total,
    hasMore: offset + rows.length < total
  };
};

export const adminRouter = Router();

adminRouter.get("/moderation/flags", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedQuery = moderationFlagQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({
      error: "Invalid moderation query parameters",
      details: parsedQuery.error.flatten()
    });
    return;
  }

  const { page, pageSize, status, targetType } = parsedQuery.data;
  const payload = await listModerationFlags({
    page,
    pageSize,
    status,
    targetType
  });

  res.status(200).json({
    entries: payload.entries,
    total: payload.total,
    page,
    pageSize,
    hasMore: payload.hasMore
  });
});

adminRouter.post("/moderation/flags/:id/resolve", requireSession, async (req, res) => {
  const parsedParams = moderationFlagResolveParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid moderation flag identifier",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const parsedBody = moderationFlagResolveBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid moderation resolve payload",
      details: parsedBody.error.flatten()
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const flagRows = await db
    .select({
      id: moderationFlags.id,
      targetType: moderationFlags.targetType,
      targetLabel: moderationFlags.targetLabel,
      status: moderationFlags.status
    })
    .from(moderationFlags)
    .where(eq(moderationFlags.id, parsedParams.data.id))
    .limit(1);

  const flag = flagRows[0];
  if (!flag) {
    res.status(404).json({
      error: "Moderation flag not found"
    });
    return;
  }

  if (flag.status !== "open") {
    res.status(409).json({
      error: "Moderation flag already resolved"
    });
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;
  const note = parsedBody.data.note.trim();
  const resolvedAt = new Date();

  const updatedRows = await db
    .update(moderationFlags)
    .set({
      status: "resolved",
      resolvedBy: actorId,
      resolvedAt,
      resolutionNote: note
    })
    .where(and(eq(moderationFlags.id, flag.id), eq(moderationFlags.status, "open")))
    .returning({
      id: moderationFlags.id,
      createdAt: moderationFlags.createdAt,
      targetType: moderationFlags.targetType,
      targetId: moderationFlags.targetId,
      targetLabel: moderationFlags.targetLabel,
      reason: moderationFlags.reason,
      status: moderationFlags.status,
      resolvedBy: moderationFlags.resolvedBy,
      resolvedAt: moderationFlags.resolvedAt,
      resolutionNote: moderationFlags.resolutionNote
    });

  const updatedFlag = updatedRows[0];
  if (!updatedFlag) {
    res.status(409).json({
      error: "Moderation flag already resolved"
    });
    return;
  }

  await persistAuditLog({
    scope: "moderation",
    action: "Resolve flag",
    target: `${flag.targetType}:${flag.targetLabel}`,
    status: "success",
    message: note,
    actorId,
    actorName
  });

  res.status(200).json({
    flag: {
      id: updatedFlag.id,
      createdAt: updatedFlag.createdAt.toISOString(),
      targetType: updatedFlag.targetType,
      targetId: updatedFlag.targetId,
      targetLabel: updatedFlag.targetLabel,
      reason: updatedFlag.reason,
      status: updatedFlag.status,
      resolvedBy: updatedFlag.resolvedBy,
      resolvedAt: updatedFlag.resolvedAt ? updatedFlag.resolvedAt.toISOString() : null,
      resolutionNote: updatedFlag.resolutionNote
    }
  });
});

adminRouter.get("/content/chapters", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const chapterRows = await db
    .select({
      id: chapters.id,
      chapterNumber: chapters.chapterNumber,
      title: chapters.title,
      subjectName: subjects.name,
      grade: subjects.grade,
      boardName: boards.name,
      isPublished: chapters.isPublished
    })
    .from(chapters)
    .innerJoin(subjects, eq(chapters.subjectId, subjects.id))
    .innerJoin(boards, eq(subjects.boardId, boards.id))
    .orderBy(asc(subjects.name), asc(chapters.chapterNumber));

  res.status(200).json({
    chapters: chapterRows
  });
});

adminRouter.post("/content/chapters/:id/publish", requireSession, async (req, res) => {
  const parsedParams = chapterParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid chapter identifier",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const parsedBody = chapterPublishBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid chapter publish payload",
      details: parsedBody.error.flatten()
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const action = parsedBody.data.isPublished ? "Publish chapter" : "Unpublish chapter";
  const fallbackTarget = `Chapter #${parsedParams.data.id}`;
  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;

  const chapterRows = await db
    .select({
      id: chapters.id,
      title: chapters.title,
      subjectName: subjects.name
    })
    .from(chapters)
    .innerJoin(subjects, eq(chapters.subjectId, subjects.id))
    .where(eq(chapters.id, parsedParams.data.id))
    .limit(1);

  const chapterRow = chapterRows[0];
  if (!chapterRow) {
    const message = "Chapter not found";
    await persistAuditLog({
      scope: "content",
      action,
      target: fallbackTarget,
      status: "failed",
      message,
      actorId,
      actorName
    });
    res.status(404).json({
      error: message
    });
    return;
  }

  const updatedRows = await db
    .update(chapters)
    .set({
      isPublished: parsedBody.data.isPublished
    })
    .where(eq(chapters.id, parsedParams.data.id))
    .returning({
      id: chapters.id,
      isPublished: chapters.isPublished
    });

  const updatedChapter = updatedRows[0];
  if (!updatedChapter) {
    const message = "Chapter not found";
    await persistAuditLog({
      scope: "content",
      action,
      target: `${chapterRow.subjectName} - ${chapterRow.title}`,
      status: "failed",
      message,
      actorId,
      actorName
    });
    res.status(404).json({
      error: message
    });
    return;
  }

  await persistAuditLog({
    scope: "content",
    action,
    target: `${chapterRow.subjectName} - ${chapterRow.title}`,
    status: "success",
    message: parsedBody.data.isPublished ? "Chapter published successfully." : "Chapter unpublished successfully.",
    actorId,
    actorName
  });

  res.status(200).json({
    chapter: updatedChapter,
    timestamp: new Date().toISOString()
  });
});

adminRouter.post("/forum/threads/:threadId/pin", requireSession, async (req, res) => {
  const parsedParams = threadParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid thread identifier",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const parsedBody = threadPinBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid thread pin payload",
      details: parsedBody.error.flatten()
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const action = parsedBody.data.isPinned ? "Pin thread" : "Unpin thread";
  const fallbackTarget = `Thread ${parsedParams.data.threadId}`;
  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;

  const threadRows = await db
    .select({
      id: forumThreads.id,
      title: forumThreads.title
    })
    .from(forumThreads)
    .where(eq(forumThreads.id, parsedParams.data.threadId))
    .limit(1);

  const threadRow = threadRows[0];
  if (!threadRow) {
    const message = "Thread not found";
    await persistAuditLog({
      scope: "forum",
      action,
      target: fallbackTarget,
      status: "failed",
      message,
      actorId,
      actorName
    });
    res.status(404).json({
      error: message
    });
    return;
  }

  const updatedAt = new Date();
  const updatedRows = await db
    .update(forumThreads)
    .set({
      isPinned: parsedBody.data.isPinned,
      updatedAt
    })
    .where(eq(forumThreads.id, parsedParams.data.threadId))
    .returning({
      id: forumThreads.id,
      isPinned: forumThreads.isPinned,
      updatedAt: forumThreads.updatedAt
    });

  const updatedThread = updatedRows[0];
  if (!updatedThread) {
    const message = "Thread not found";
    await persistAuditLog({
      scope: "forum",
      action,
      target: threadRow.title,
      status: "failed",
      message,
      actorId,
      actorName
    });
    res.status(404).json({
      error: message
    });
    return;
  }

  await persistAuditLog({
    scope: "forum",
    action,
    target: threadRow.title,
    status: "success",
    message: parsedBody.data.isPinned ? "Thread pinned successfully." : "Thread unpinned successfully.",
    actorId,
    actorName
  });

  res.status(200).json({
    thread: {
      id: updatedThread.id,
      isPinned: updatedThread.isPinned
    },
    timestamp: updatedThread.updatedAt.toISOString()
  });
});

adminRouter.get("/content/audit-logs", requireSession, async (req, res) => {
  await handleAuditLogRead(req as AuthenticatedRequest, res, "content");
});

adminRouter.get("/forum/audit-logs", requireSession, async (req, res) => {
  await handleAuditLogRead(req as AuthenticatedRequest, res, "forum");
});

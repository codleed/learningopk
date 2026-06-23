import { and, desc, eq, or, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { requireStaffRole } from "../../lib/admin.js";
import { moderateForumInput } from "../../lib/ai-guardrails.js";
import { db } from "../../lib/db/index.js";
import {
  forumReplies,
  forumThreads,
  moderationFlags,
  moderationWarnings,
  users
} from "../../lib/db/schema.js";
import { requireSession, type AuthenticatedRequest } from "../../lib/session.js";
import { persistAuditLog, type AdminAuditScope } from "./shared.js";

export const moderationAdminRouter = Router();

const threadParamsSchema = z.object({
  threadId: z.string().uuid()
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

const editThreadBodySchema = z.object({
  title: z.string().trim().min(5).max(160).optional(),
  body: z.string().trim().min(10).max(50000).optional()
});

const replyEditBodySchema = z.object({
  body: z.string().trim().min(2).max(50000)
});

const replyParamsSchema = z.object({
  replyId: z.string().uuid()
});

const warnUserBodySchema = z.object({
  reason: z.string().trim().min(10).max(500)
});

const warnUserParamsSchema = z.object({
  id: z.string().trim().min(1)
});

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

moderationAdminRouter.get("/moderation/flags", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireStaffRole(authedReq, res))) {
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
    ...(targetType ? { targetType } : {})
  });

  res.status(200).json({
    entries: payload.entries,
    total: payload.total,
    page,
    pageSize,
    hasMore: payload.hasMore
  });
});

moderationAdminRouter.post("/moderation/flags/:id/resolve", requireSession, async (req, res) => {
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
  if (!(await requireStaffRole(authedReq, res))) {
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

moderationAdminRouter.post("/moderation/threads/:threadId/edit", requireSession, async (req, res) => {
  const parsedParams = threadParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({ error: "Invalid thread identifier", details: parsedParams.error.flatten() });
    return;
  }
  const parsedBody = editThreadBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({ error: "Invalid edit payload", details: parsedBody.error.flatten() });
    return;
  }
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireStaffRole(authedReq, res))) return;

  const { threadId } = parsedParams.data;
  const updates: Record<string, unknown> = {};
  if (parsedBody.data.title !== undefined) updates.title = parsedBody.data.title;
  if (parsedBody.data.body !== undefined) updates.body = parsedBody.data.body;

  if (parsedBody.data.body) {
    const moderationResult = moderateForumInput(parsedBody.data.body);
    if (moderationResult.blocked) {
      res.status(400).json({
        error: `Content blocked: ${moderationResult.reason}`,
        code: "CONTENT_MODERATED"
      });
      return;
    }
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  const updated = await db
    .update(forumThreads)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(forumThreads.id, threadId))
    .returning({ id: forumThreads.id, title: forumThreads.title });

  if (!updated[0]) {
    res.status(404).json({ error: "Thread not found" });
    return;
  }

  await persistAuditLog({
    scope: "moderation",
    action: "Edit thread",
    target: `thread:${updated[0].title}`,
    status: "success",
    message: `Staff edited thread ${threadId}`,
    actorId: authedReq.session.user.id,
    actorName: authedReq.session.user.name ?? "Unknown"
  });

  res.status(200).json({ thread: updated[0] });
});

moderationAdminRouter.post("/moderation/threads/:threadId/delete", requireSession, async (req, res) => {
  const parsedParams = threadParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({ error: "Invalid thread identifier", details: parsedParams.error.flatten() });
    return;
  }
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireStaffRole(authedReq, res))) return;

  const updated = await db
    .update(forumThreads)
    .set({ isDeleted: true, updatedAt: new Date() })
    .where(eq(forumThreads.id, parsedParams.data.threadId))
    .returning({ id: forumThreads.id, title: forumThreads.title });

  if (!updated[0]) {
    res.status(404).json({ error: "Thread not found" });
    return;
  }

  await persistAuditLog({
    scope: "moderation",
    action: "Delete thread",
    target: `thread:${updated[0].title}`,
    status: "success",
    message: `Staff soft-deleted thread ${parsedParams.data.threadId}`,
    actorId: authedReq.session.user.id,
    actorName: authedReq.session.user.name ?? "Unknown"
  });

  res.status(200).json({ deleted: true });
});

moderationAdminRouter.post("/moderation/replies/:replyId/edit", requireSession, async (req, res) => {
  const parsedParams = replyParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({ error: "Invalid reply identifier", details: parsedParams.error.flatten() });
    return;
  }
  const parsedBody = replyEditBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({ error: "Invalid edit payload", details: parsedBody.error.flatten() });
    return;
  }
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireStaffRole(authedReq, res))) return;

  if (parsedBody.data.body) {
    const moderationResult = moderateForumInput(parsedBody.data.body);
    if (moderationResult.blocked) {
      res.status(400).json({
        error: `Content blocked: ${moderationResult.reason}`,
        code: "CONTENT_MODERATED"
      });
      return;
    }
  }

  const updated = await db
    .update(forumReplies)
    .set({ body: parsedBody.data.body, updatedAt: new Date() })
    .where(eq(forumReplies.id, parsedParams.data.replyId))
    .returning({ id: forumReplies.id, threadId: forumReplies.threadId });

  if (!updated[0]) {
    res.status(404).json({ error: "Reply not found" });
    return;
  }

  await persistAuditLog({
    scope: "moderation",
    action: "Edit reply",
    target: `reply:${parsedParams.data.replyId}`,
    status: "success",
    message: `Staff edited reply ${parsedParams.data.replyId}`,
    actorId: authedReq.session.user.id,
    actorName: authedReq.session.user.name ?? "Unknown"
  });

  res.status(200).json({ reply: updated[0] });
});

moderationAdminRouter.post("/moderation/replies/:replyId/delete", requireSession, async (req, res) => {
  const parsedParams = replyParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({ error: "Invalid reply identifier", details: parsedParams.error.flatten() });
    return;
  }
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireStaffRole(authedReq, res))) return;

  const updated = await db
    .update(forumReplies)
    .set({ isDeleted: true, updatedAt: new Date() })
    .where(eq(forumReplies.id, parsedParams.data.replyId))
    .returning({ id: forumReplies.id, threadId: forumReplies.threadId });

  if (!updated[0]) {
    res.status(404).json({ error: "Reply not found" });
    return;
  }

  await persistAuditLog({
    scope: "moderation",
    action: "Delete reply",
    target: `reply:${parsedParams.data.replyId}`,
    status: "success",
    message: `Staff soft-deleted reply ${parsedParams.data.replyId}`,
    actorId: authedReq.session.user.id,
    actorName: authedReq.session.user.name ?? "Unknown"
  });

  res.status(200).json({ deleted: true });
});

moderationAdminRouter.post("/moderation/users/:id/warn", requireSession, async (req, res) => {
  const parsedParams = warnUserParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({ error: "Invalid user identifier", details: parsedParams.error.flatten() });
    return;
  }
  const parsedBody = warnUserBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({ error: "Invalid warning payload", details: parsedBody.error.flatten() });
    return;
  }
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireStaffRole(authedReq, res))) return;

  const existingUser = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.id, parsedParams.data.id))
    .limit(1);

  if (!existingUser[0]) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [warning] = await db
    .insert(moderationWarnings)
    .values({
      userId: parsedParams.data.id,
      warnedBy: authedReq.session.user.id,
      reason: parsedBody.data.reason
    })
    .returning();

  await persistAuditLog({
    scope: "moderation",
    action: "Warn user",
    target: `user:${existingUser[0].name}`,
    status: "success",
    message: parsedBody.data.reason,
    actorId: authedReq.session.user.id,
    actorName: authedReq.session.user.name ?? "Unknown"
  });

  res.status(200).json({
    warning: {
      id: warning!.id,
      userId: warning!.userId,
      reason: warning!.reason,
      acknowledged: warning!.acknowledged,
      createdAt: warning!.createdAt.toISOString()
    }
  });
});

const tempBanBodySchema = z.object({
  reason: z.string().trim().min(10).max(500),
  durationHours: z.coerce.number().int().min(1).max(720)
});

moderationAdminRouter.post("/moderation/users/:id/temp-ban", requireSession, async (req, res) => {
  const parsedParams = warnUserParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({ error: "Invalid user identifier", details: parsedParams.error.flatten() });
    return;
  }
  const parsedBody = tempBanBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({ error: "Invalid temp-ban payload", details: parsedBody.error.flatten() });
    return;
  }
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireStaffRole(authedReq, res))) return;

  const existingUser = await db
    .select({ id: users.id, name: users.name, status: users.status, role: users.role })
    .from(users)
    .where(eq(users.id, parsedParams.data.id))
    .limit(1);

  if (!existingUser[0]) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (existingUser[0].role !== "student") {
    res.status(400).json({ error: "Only student accounts can be temporarily banned" });
    return;
  }

  if (existingUser[0].status === "suspended") {
    res.status(400).json({ error: "User is already suspended" });
    return;
  }

  const { reason, durationHours } = parsedBody.data;
  const now = new Date();
  const until = new Date(now.getTime() + durationHours * 60 * 60 * 1000);

  await db
    .update(users)
    .set({
      status: "suspended",
      suspendedAt: now,
      suspendedReason: reason,
      suspendedBy: authedReq.session.user.id,
      suspendedUntil: until
    })
    .where(eq(users.id, parsedParams.data.id));

  await persistAuditLog({
    scope: "moderation",
    action: "Temp ban user",
    target: `user:${existingUser[0].name}`,
    status: "success",
    message: `${reason} (${durationHours}h, until ${until.toISOString()})`,
    actorId: authedReq.session.user.id,
    actorName: authedReq.session.user.name ?? "Unknown"
  });

  res.status(200).json({
    banned: true,
    suspendedUntil: until.toISOString(),
    durationHours
  });
});

moderationAdminRouter.get("/moderation/user-history/:id", requireSession, async (req, res) => {
  const parsedParams = warnUserParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({ error: "Invalid user identifier", details: parsedParams.error.flatten() });
    return;
  }
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireStaffRole(authedReq, res))) return;

  const userId = parsedParams.data.id;

  const [flags, warnings] = await Promise.all([
    db
      .select({
        id: moderationFlags.id,
        targetType: moderationFlags.targetType,
        targetLabel: moderationFlags.targetLabel,
        reason: moderationFlags.reason,
        status: moderationFlags.status,
        createdAt: moderationFlags.createdAt,
        resolvedAt: moderationFlags.resolvedAt,
        resolutionNote: moderationFlags.resolutionNote
      })
      .from(moderationFlags)
      .leftJoin(forumThreads, and(
        eq(moderationFlags.targetType, sql`'thread'`),
        eq(moderationFlags.targetId, forumThreads.id)
      ))
      .leftJoin(forumReplies, and(
        eq(moderationFlags.targetType, sql`'reply'`),
        eq(moderationFlags.targetId, forumReplies.id)
      ))
      .where(
        or(
          eq(forumThreads.userId, userId),
          eq(forumReplies.userId, userId)
        )
      )
      .orderBy(desc(moderationFlags.createdAt))
      .limit(50),
    db
      .select({
        id: moderationWarnings.id,
        reason: moderationWarnings.reason,
        acknowledged: moderationWarnings.acknowledged,
        createdAt: moderationWarnings.createdAt
      })
      .from(moderationWarnings)
      .where(eq(moderationWarnings.userId, userId))
      .orderBy(desc(moderationWarnings.createdAt))
      .limit(50)
  ]);

  res.status(200).json({
    flags: flags.map((f) => ({
      ...f,
      createdAt: f.createdAt.toISOString(),
      resolvedAt: f.resolvedAt?.toISOString() ?? null
    })),
    warnings: warnings.map((w) => ({
      ...w,
      createdAt: w.createdAt.toISOString()
    }))
  });
});

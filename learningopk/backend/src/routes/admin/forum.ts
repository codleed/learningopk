import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { requireStaffRole } from "../../lib/admin.js";
import { CacheKeys, cacheService } from "../../lib/cache/cache.service.js";
import { db } from "../../lib/db/index.js";
import { forumThreads, users } from "../../lib/db/schema.js";
import { requireSession, type AuthenticatedRequest } from "../../lib/session.js";
import { persistAuditLog } from "./shared.js";

const threadParamsSchema = z.object({
  threadId: z.string().uuid()
});

const threadPinBodySchema = z.object({
  isPinned: z.boolean()
});

const adminCommunityThreadsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  solved: z.enum(["all", "solved", "unsolved"]).optional().default("all"),
  pinned: z.enum(["all", "pinned", "unpinned"]).optional().default("all"),
  flagState: z.enum(["all", "openFlags", "noOpenFlags"]).optional().default("all")
});

const listAdminCommunityThreads = async ({
  page,
  pageSize,
  solved,
  pinned,
  flagState
}: {
  page: number;
  pageSize: number;
  solved: "all" | "solved" | "unsolved";
  pinned: "all" | "pinned" | "unpinned";
  flagState: "all" | "openFlags" | "noOpenFlags";
}) => {
  const offset = (page - 1) * pageSize;
  const threadIdAsText = sql`${forumThreads.id}::text`;
  const predicates: SQL[] = [eq(forumThreads.isDeleted, false)];

  if (solved === "solved") {
    predicates.push(eq(forumThreads.isSolved, true));
  } else if (solved === "unsolved") {
    predicates.push(eq(forumThreads.isSolved, false));
  }

  if (pinned === "pinned") {
    predicates.push(eq(forumThreads.isPinned, true));
  } else if (pinned === "unpinned") {
    predicates.push(eq(forumThreads.isPinned, false));
  }

  if (flagState === "openFlags") {
    predicates.push(
      sql`exists (
        select 1
        from moderation_flags
        where moderation_flags.target_type = 'thread'
          and moderation_flags.status = 'open'
          and moderation_flags.target_id = ${threadIdAsText}
      )`
    );
  } else if (flagState === "noOpenFlags") {
    predicates.push(
      sql`not exists (
        select 1
        from moderation_flags
        where moderation_flags.target_type = 'thread'
          and moderation_flags.status = 'open'
          and moderation_flags.target_id = ${threadIdAsText}
      )`
    );
  }

  const whereClause = predicates.length > 0 ? and(...predicates) : undefined;

  const rows = await db
    .select({
      threadId: forumThreads.id,
      title: forumThreads.title,
      authorName: users.name,
      createdAt: forumThreads.createdAt,
      isPinned: forumThreads.isPinned,
      isSolved: forumThreads.isSolved,
      isDeleted: forumThreads.isDeleted,
      replyCount: sql<number>`(
        select count(*)::int
        from forum_replies
        where forum_replies.thread_id = ${forumThreads.id}
          and forum_replies.is_deleted = false
      )`,
      views: forumThreads.views,
      openFlagCount: sql<number>`(
        select count(*)::int
        from moderation_flags
        where moderation_flags.target_type = 'thread'
          and moderation_flags.status = 'open'
          and moderation_flags.target_id = ${threadIdAsText}
      )`
    })
    .from(forumThreads)
    .innerJoin(users, eq(forumThreads.userId, users.id))
    .where(whereClause)
    .orderBy(desc(forumThreads.createdAt), desc(forumThreads.id))
    .offset(offset)
    .limit(pageSize);

  const totalRows = await db
    .select({
      count: sql<number>`count(*)::int`
    })
    .from(forumThreads)
    .where(whereClause);
  const total = totalRows[0]?.count ?? 0;

  return {
    entries: rows.map((row) => ({
      threadId: row.threadId,
      title: row.title,
      authorName: row.authorName,
      createdAt: row.createdAt.toISOString(),
      isPinned: row.isPinned,
      isSolved: row.isSolved,
      isDeleted: row.isDeleted,
      replyCount: row.replyCount,
      views: row.views,
      openFlagCount: row.openFlagCount
    })),
    total,
    hasMore: offset + rows.length < total
  };
};

export const forumAdminRouter = Router();

forumAdminRouter.get("/community/threads", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireStaffRole(authedReq, res))) {
    return;
  }

  const parsedQuery = adminCommunityThreadsQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({
      error: "Invalid community threads query parameters",
      details: parsedQuery.error.flatten()
    });
    return;
  }

  const { page, pageSize, solved, pinned, flagState } = parsedQuery.data;
  const payload = await listAdminCommunityThreads({
    page,
    pageSize,
    solved,
    pinned,
    flagState
  });

  res.status(200).json({
    entries: payload.entries,
    total: payload.total,
    page,
    pageSize,
    hasMore: payload.hasMore
  });
});

forumAdminRouter.post("/forum/threads/:threadId/pin", requireSession, async (req, res) => {
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
  if (!(await requireStaffRole(authedReq, res))) {
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

  // Invalidate forum thread caches (pinning affects thread listing order)
  await cacheService.invalidatePattern("forum:threads:*");
  await cacheService.delete(CacheKeys.forumThreadDetail(parsedParams.data.threadId));

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

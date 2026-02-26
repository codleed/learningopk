import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { Router, type Response } from "express";
import { z } from "zod";

import { requireAdminRole } from "../lib/admin.js";
import { db } from "../lib/db/index.js";
import {
  adminAuditLogs,
  adminNotifications,
  adminSettings,
  boards,
  chapters,
  forumThreads,
  moderationFlags,
  quizAttempts,
  quizzes,
  subjects,
  userProgress,
  users
} from "../lib/db/schema.js";
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

const adminUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  q: z.string().trim().optional().default(""),
  role: z.enum(["student", "admin"]).optional()
});

const adminCommunityThreadsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  solved: z.enum(["all", "solved", "unsolved"]).optional().default("all"),
  pinned: z.enum(["all", "pinned", "unpinned"]).optional().default("all"),
  flagState: z.enum(["all", "openFlags", "noOpenFlags"]).optional().default("all")
});

const adminAnalyticsOverviewQuerySchema = z.object({
  windowDays: z.coerce
    .number()
    .int()
    .optional()
    .default(30)
    .refine((value) => [7, 30, 90].includes(value), {
      message: "windowDays must be one of: 7, 30, 90"
    })
});

const adminNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20)
});

const adminNotificationCreateBodySchema = z.object({
  title: z.string().trim().min(5),
  message: z.string().trim().min(10),
  audience: z.enum(["all", "students", "admins"])
});

const adminSettingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20)
});

const adminSettingsParamsSchema = z.object({
  key: z.string().trim().min(1)
});

const adminSettingsUpdateBodySchema = z.object({
  value: z.string().trim().min(1).max(2000)
});

const updatableAdminSettingKeys = new Set([
  "forum_auto_lock_hours",
  "quiz_pass_threshold_percent",
  "maintenance_banner_enabled"
]);

type AdminAuditScope = "content" | "forum" | "moderation" | "notifications" | "settings";

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

const listAdminUsers = async ({
  page,
  pageSize,
  q,
  role
}: {
  page: number;
  pageSize: number;
  q: string;
  role?: "student" | "admin";
}) => {
  const offset = (page - 1) * pageSize;
  const searchTerm = q.trim();
  const rolePredicate = role ? eq(users.role, role) : undefined;
  const searchPredicate =
    searchTerm.length > 0 ? or(ilike(users.name, `%${searchTerm}%`), ilike(users.email, `%${searchTerm}%`)) : undefined;
  const whereClause =
    rolePredicate && searchPredicate ? and(rolePredicate, searchPredicate) : (rolePredicate ?? searchPredicate);

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt
    })
    .from(users)
    .where(whereClause)
    .orderBy(desc(users.createdAt), desc(users.id))
    .offset(offset)
    .limit(pageSize);

  const totalRows = await db
    .select({
      count: sql<number>`count(*)::int`
    })
    .from(users)
    .where(whereClause);
  const total = totalRows[0]?.count ?? 0;

  return {
    entries: rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      createdAt: row.createdAt.toISOString()
    })),
    total,
    hasMore: offset + rows.length < total
  };
};

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
  const predicates: SQL[] = [];

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
      replyCount: sql<number>`(
        select count(*)::int
        from forum_replies
        where forum_replies.thread_id = ${forumThreads.id}
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
      replyCount: row.replyCount,
      views: row.views,
      openFlagCount: row.openFlagCount
    })),
    total,
    hasMore: offset + rows.length < total
  };
};

const listAdminAnalyticsOverview = async ({
  windowDays
}: {
  windowDays: number;
}) => {
  const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const [activeStudentsRow] = await db
    .select({
      count: sql<number>`count(distinct ${userProgress.userId})::int`
    })
    .from(userProgress)
    .where(sql`${userProgress.visitedAt} >= ${windowStart}`);

  const [quizAttemptsRow] = await db
    .select({
      count: sql<number>`count(*)::int`
    })
    .from(quizAttempts)
    .where(sql`${quizAttempts.completedAt} >= ${windowStart}`);

  const [averageQuizScoreRow] = await db
    .select({
      value: sql<number>`coalesce(avg(case when ${quizAttempts.totalMarks} > 0 then (${quizAttempts.score}::numeric * 100.0) / ${quizAttempts.totalMarks} else 0 end), 0)::float`
    })
    .from(quizAttempts)
    .where(sql`${quizAttempts.completedAt} >= ${windowStart}`);

  const [threadsCreatedRow] = await db
    .select({
      count: sql<number>`count(*)::int`
    })
    .from(forumThreads)
    .where(sql`${forumThreads.createdAt} >= ${windowStart}`);

  const [openModerationFlagsRow] = await db
    .select({
      count: sql<number>`count(*)::int`
    })
    .from(moderationFlags)
    .where(eq(moderationFlags.status, "open"));

  const subjectPerformanceRows = await db
    .select({
      subjectId: subjects.id,
      subjectName: subjects.name,
      grade: subjects.grade,
      boardName: boards.name,
      attempts: sql<number>`count(${quizAttempts.id})::int`,
      averageScorePercent: sql<number>`coalesce(avg(case when ${quizAttempts.totalMarks} > 0 then (${quizAttempts.score}::numeric * 100.0) / ${quizAttempts.totalMarks} else 0 end), 0)::float`,
      activeStudents: sql<number>`count(distinct ${quizAttempts.userId})::int`
    })
    .from(quizAttempts)
    .innerJoin(quizzes, eq(quizAttempts.quizId, quizzes.id))
    .innerJoin(chapters, eq(quizzes.chapterId, chapters.id))
    .innerJoin(subjects, eq(chapters.subjectId, subjects.id))
    .innerJoin(boards, eq(subjects.boardId, boards.id))
    .where(sql`${quizAttempts.completedAt} >= ${windowStart}`)
    .groupBy(subjects.id, subjects.name, subjects.grade, boards.name)
    .orderBy(desc(sql`count(${quizAttempts.id})`), asc(subjects.name));

  return {
    windowDays,
    summary: {
      activeStudents: activeStudentsRow?.count ?? 0,
      quizAttempts: quizAttemptsRow?.count ?? 0,
      averageQuizScorePercent: Number(averageQuizScoreRow?.value ?? 0),
      threadsCreated: threadsCreatedRow?.count ?? 0,
      openModerationFlags: openModerationFlagsRow?.count ?? 0
    },
    subjectPerformance: subjectPerformanceRows.map((row) => ({
      subjectId: row.subjectId,
      subjectName: row.subjectName,
      grade: row.grade,
      boardName: row.boardName,
      attempts: row.attempts,
      averageScorePercent: Number(row.averageScorePercent),
      activeStudents: row.activeStudents
    }))
  };
};

const listAdminNotifications = async ({
  page,
  pageSize
}: {
  page: number;
  pageSize: number;
}) => {
  const offset = (page - 1) * pageSize;
  const rows = await db
    .select({
      id: adminNotifications.id,
      title: adminNotifications.title,
      message: adminNotifications.message,
      audience: adminNotifications.audience,
      status: adminNotifications.status,
      createdById: adminNotifications.createdBy,
      createdByName: users.name,
      createdAt: adminNotifications.createdAt
    })
    .from(adminNotifications)
    .innerJoin(users, eq(adminNotifications.createdBy, users.id))
    .orderBy(desc(adminNotifications.createdAt), desc(adminNotifications.id))
    .offset(offset)
    .limit(pageSize);

  const totalRows = await db
    .select({
      count: sql<number>`count(*)::int`
    })
    .from(adminNotifications);
  const total = totalRows[0]?.count ?? 0;

  return {
    entries: rows.map((row) => ({
      id: row.id,
      title: row.title,
      message: row.message,
      audience: row.audience,
      status: row.status,
      createdBy: {
        id: row.createdById,
        name: row.createdByName
      },
      createdAt: row.createdAt.toISOString()
    })),
    total,
    hasMore: offset + rows.length < total
  };
};

const listAdminSettings = async ({
  page,
  pageSize
}: {
  page: number;
  pageSize: number;
}) => {
  const offset = (page - 1) * pageSize;
  const rows = await db
    .select({
      key: adminSettings.key,
      value: adminSettings.value,
      description: adminSettings.description,
      updatedAt: adminSettings.updatedAt,
      updatedById: adminSettings.updatedBy,
      updatedByName: users.name
    })
    .from(adminSettings)
    .leftJoin(users, eq(adminSettings.updatedBy, users.id))
    .orderBy(asc(adminSettings.key))
    .offset(offset)
    .limit(pageSize);

  const totalRows = await db
    .select({
      count: sql<number>`count(*)::int`
    })
    .from(adminSettings);
  const total = totalRows[0]?.count ?? 0;

  return {
    entries: rows.map((row) => ({
      key: row.key,
      value: row.value,
      description: row.description,
      updatedBy: row.updatedById
        ? {
            id: row.updatedById,
            name: row.updatedByName ?? "Unknown"
          }
        : null,
      updatedAt: row.updatedAt.toISOString()
    })),
    total,
    hasMore: offset + rows.length < total
  };
};

export const adminRouter = Router();

adminRouter.get("/notifications", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedQuery = adminNotificationsQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({
      error: "Invalid notifications query parameters",
      details: parsedQuery.error.flatten()
    });
    return;
  }

  const { page, pageSize } = parsedQuery.data;
  const payload = await listAdminNotifications({ page, pageSize });

  res.status(200).json({
    entries: payload.entries,
    total: payload.total,
    page,
    pageSize,
    hasMore: payload.hasMore
  });
});

adminRouter.post("/notifications", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedBody = adminNotificationCreateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid notification payload",
      details: parsedBody.error.flatten()
    });
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;
  const createdRows = await db
    .insert(adminNotifications)
    .values({
      title: parsedBody.data.title.trim(),
      message: parsedBody.data.message.trim(),
      audience: parsedBody.data.audience,
      createdBy: actorId
    })
    .returning({
      id: adminNotifications.id,
      title: adminNotifications.title,
      message: adminNotifications.message,
      audience: adminNotifications.audience,
      status: adminNotifications.status,
      createdBy: adminNotifications.createdBy,
      createdAt: adminNotifications.createdAt
    });

  const created = createdRows[0];
  if (!created) {
    res.status(500).json({
      error: "Failed to create notification"
    });
    return;
  }

  await persistAuditLog({
    scope: "notifications",
    action: "Send notification broadcast",
    target: `audience:${created.audience}`,
    status: "success",
    message: `${created.title}: ${created.message}`,
    actorId,
    actorName
  });

  res.status(201).json({
    notification: {
      id: created.id,
      title: created.title,
      message: created.message,
      audience: created.audience,
      status: created.status,
      createdBy: {
        id: created.createdBy,
        name: actorName
      },
      createdAt: created.createdAt.toISOString()
    }
  });
});

adminRouter.get("/settings", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedQuery = adminSettingsQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({
      error: "Invalid settings query parameters",
      details: parsedQuery.error.flatten()
    });
    return;
  }

  const { page, pageSize } = parsedQuery.data;
  const payload = await listAdminSettings({ page, pageSize });

  res.status(200).json({
    entries: payload.entries,
    total: payload.total,
    page,
    pageSize,
    hasMore: payload.hasMore
  });
});

adminRouter.post("/settings/:key", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedParams = adminSettingsParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid setting key",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const parsedBody = adminSettingsUpdateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid setting update payload",
      details: parsedBody.error.flatten()
    });
    return;
  }

  const key = parsedParams.data.key.trim();
  if (!updatableAdminSettingKeys.has(key)) {
    res.status(404).json({
      error: "Setting key not found"
    });
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;
  const now = new Date();
  const updatedRows = await db
    .update(adminSettings)
    .set({
      value: parsedBody.data.value.trim(),
      updatedBy: actorId,
      updatedAt: now
    })
    .where(eq(adminSettings.key, key))
    .returning({
      key: adminSettings.key,
      value: adminSettings.value,
      description: adminSettings.description,
      updatedBy: adminSettings.updatedBy,
      updatedAt: adminSettings.updatedAt
    });

  const updated = updatedRows[0];
  if (!updated) {
    res.status(404).json({
      error: "Setting key not found"
    });
    return;
  }

  await persistAuditLog({
    scope: "settings",
    action: "Update setting",
    target: key,
    status: "success",
    message: `Updated ${key} to ${updated.value}`,
    actorId,
    actorName
  });

  res.status(200).json({
    setting: {
      key: updated.key,
      value: updated.value,
      description: updated.description,
      updatedBy: {
        id: updated.updatedBy,
        name: actorName
      },
      updatedAt: updated.updatedAt.toISOString()
    }
  });
});

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

adminRouter.get("/users", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedQuery = adminUsersQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({
      error: "Invalid users query parameters",
      details: parsedQuery.error.flatten()
    });
    return;
  }

  const { page, pageSize, q, role } = parsedQuery.data;
  const payload = await listAdminUsers({
    page,
    pageSize,
    q,
    ...(role ? { role } : {})
  });

  res.status(200).json({
    entries: payload.entries,
    total: payload.total,
    page,
    pageSize,
    hasMore: payload.hasMore
  });
});

adminRouter.get("/community/threads", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
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

adminRouter.get("/analytics/overview", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedQuery = adminAnalyticsOverviewQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({
      error: "Invalid analytics overview query parameters",
      details: parsedQuery.error.flatten()
    });
    return;
  }

  const payload = await listAdminAnalyticsOverview({
    windowDays: parsedQuery.data.windowDays
  });

  res.status(200).json(payload);
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

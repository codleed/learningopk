import { and, asc, desc, eq, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { requireAdminRole, requireStaffRole } from "../../lib/admin.js";
import { db } from "../../lib/db/index.js";
import {
  adminAuditLogs,
  adminNotifications,
  aiChatSessions,
  aiConversationEvents,
  boards,
  chapters,
  forumThreads,
  moderationFlags,
  quizzes,
  quizAttempts,
  subjects,
  userProgress,
  users
} from "../../lib/db/schema.js";
import { requireSession, type AuthenticatedRequest } from "../../lib/session.js";

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

const adminOverviewQuerySchema = z.object({
  windowDays: z.coerce
    .number()
    .int()
    .optional()
    .default(30)
    .refine((value) => [7, 30, 90].includes(value), {
      message: "windowDays must be one of: 7, 30, 90"
    })
});

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

  const confusionRows = await db
    .select({
      chapterId: chapters.id,
      chapterTitle: chapters.title,
      subjectName: subjects.name,
      count: sql<number>`count(${aiConversationEvents.id})::int`
    })
    .from(aiConversationEvents)
    .innerJoin(aiChatSessions, eq(aiConversationEvents.sessionId, aiChatSessions.id))
    .innerJoin(chapters, eq(aiChatSessions.chapterId, chapters.id))
    .innerJoin(subjects, eq(chapters.subjectId, subjects.id))
    .where(and(eq(aiConversationEvents.eventType, "confusion_detected"), sql`${aiConversationEvents.createdAt} >= ${windowStart}`))
    .groupBy(chapters.id, chapters.title, subjects.name)
    .orderBy(desc(sql`count(${aiConversationEvents.id})`), asc(chapters.title))
    .limit(10);

  return {
    windowDays,
    summary: {
      activeStudents: activeStudentsRow?.count ?? 0,
      quizAttempts: quizAttemptsRow?.count ?? 0,
      averageQuizScorePercent: Number(averageQuizScoreRow?.value ?? 0),
      threadsCreated: threadsCreatedRow?.count ?? 0,
      openModerationFlags: openModerationFlagsRow?.count ?? 0,
      confusionEvents: confusionRows.reduce((total, row) => total + row.count, 0)
    },
    subjectPerformance: subjectPerformanceRows.map((row) => ({
      subjectId: row.subjectId,
      subjectName: row.subjectName,
      grade: row.grade,
      boardName: row.boardName,
      attempts: row.attempts,
      averageScorePercent: Number(row.averageScorePercent),
      activeStudents: row.activeStudents
    })),
    confusionByChapter: confusionRows.map((row) => ({
      chapterId: row.chapterId,
      chapterTitle: row.chapterTitle,
      subjectName: row.subjectName,
      count: row.count
    }))
  };
};

const listAdminOverview = async ({
  windowDays
}: {
  windowDays: number;
}) => {
  const now = Date.now();
  const windowStart = new Date(now - windowDays * 24 * 60 * 60 * 1000);
  const failedActionsWindowStart = new Date(now - 24 * 60 * 60 * 1000);

  const [openModerationFlagsRow] = await db
    .select({
      count: sql<number>`count(*)::int`
    })
    .from(moderationFlags)
    .where(eq(moderationFlags.status, "open"));

  const [suspendedUsersRow] = await db
    .select({
      count: sql<number>`count(*)::int`
    })
    .from(users)
    .where(eq(users.status, "suspended"));

  const [failedActionsRow] = await db
    .select({
      count: sql<number>`count(*)::int`
    })
    .from(adminAuditLogs)
    .where(and(eq(adminAuditLogs.status, "failed"), sql`${adminAuditLogs.createdAt} >= ${failedActionsWindowStart}`));

  const [notificationsSentRow] = await db
    .select({
      count: sql<number>`count(*)::int`
    })
    .from(adminNotifications)
    .where(sql`${adminNotifications.createdAt} >= ${windowStart}`);

  const recentActivityRows = await db
    .select({
      id: adminAuditLogs.id,
      scope: adminAuditLogs.scope,
      action: adminAuditLogs.action,
      target: adminAuditLogs.target,
      status: adminAuditLogs.status,
      message: adminAuditLogs.message,
      actorId: adminAuditLogs.actorId,
      actorName: adminAuditLogs.actorName,
      occurredAt: adminAuditLogs.createdAt
    })
    .from(adminAuditLogs)
    .orderBy(desc(adminAuditLogs.createdAt), desc(adminAuditLogs.id))
    .limit(20);

  const kpis = {
    openModerationFlags: openModerationFlagsRow?.count ?? 0,
    suspendedUsers: suspendedUsersRow?.count ?? 0,
    failedAdminActionsLast24h: failedActionsRow?.count ?? 0,
    notificationsSentInWindow: notificationsSentRow?.count ?? 0
  };

  const reasons: string[] = [];
  if (kpis.openModerationFlags >= 10) {
    reasons.push(`Open moderation flags threshold exceeded (${kpis.openModerationFlags}/10).`);
  }
  if (kpis.failedAdminActionsLast24h >= 5) {
    reasons.push(`Failed admin actions in last 24h threshold exceeded (${kpis.failedAdminActionsLast24h}/5).`);
  }

  return {
    windowDays,
    kpis,
    alerts: {
      showHighPriorityBanner: reasons.length > 0,
      reasons
    },
    recentActivity: recentActivityRows.map((row) => ({
      id: row.id,
      scope: row.scope,
      action: row.action,
      target: row.target,
      status: row.status,
      message: row.message,
      actor: {
        id: row.actorId,
        name: row.actorName
      },
      occurredAt: row.occurredAt.toISOString()
    }))
  };
};

export const overviewAdminRouter = Router();

overviewAdminRouter.get("/overview", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedQuery = adminOverviewQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({
      error: "Invalid admin overview query parameters",
      details: parsedQuery.error.flatten()
    });
    return;
  }

  const payload = await listAdminOverview({
    windowDays: parsedQuery.data.windowDays
  });

  res.status(200).json(payload);
});

overviewAdminRouter.get("/moderator/overview", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireStaffRole(authedReq, res))) {
    return;
  }

  const [openFlagsCount, recentResolved] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(moderationFlags)
      .where(eq(moderationFlags.status, "open"))
      .then((r) => r[0]?.count ?? 0),
    db
      .select({
        id: moderationFlags.id,
        targetType: moderationFlags.targetType,
        targetLabel: moderationFlags.targetLabel,
        reason: moderationFlags.reason,
        resolvedAt: moderationFlags.resolvedAt,
        resolutionNote: moderationFlags.resolutionNote
      })
      .from(moderationFlags)
      .where(eq(moderationFlags.status, "resolved"))
      .orderBy(desc(moderationFlags.resolvedAt))
      .limit(10)
  ]);

  res.status(200).json({
    openFlags: openFlagsCount,
    recentResolved: recentResolved.map((f) => ({
      id: f.id,
      targetType: f.targetType,
      targetLabel: f.targetLabel,
      reason: f.reason,
      resolvedAt: f.resolvedAt?.toISOString() ?? null,
      resolutionNote: f.resolutionNote
    }))
  });
});

overviewAdminRouter.get("/analytics/overview", requireSession, async (req, res) => {
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

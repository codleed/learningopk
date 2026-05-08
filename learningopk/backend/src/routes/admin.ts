import { and, asc, desc, eq, ilike, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { Router, type Response } from "express";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";

import { requireAdminRole, requireStaffRole } from "../lib/admin.js";
import { moderateForumInput } from "../lib/ai-guardrails.js";
import { pastPaperRepository } from "../repositories/past-paper.repository.js";
import { CacheKeys, cacheService } from "../lib/cache/cache.service.js";
import { listAdminChapterGraph } from "../lib/chapter-graph.js";
import { db } from "../lib/db/index.js";
import { listBackups, createBackup, restoreBackup, deleteBackup } from "../services/backup.service.js";
import {
  adminAuditLogs,
  adminNotifications,
  adminSettings,
  aiConversationEvents,
  aiChatSessions,
  boardClasses,
  boards,
  chapterSubparts,
  chapterSummaryLinks,
  chapterTitleAliases,
  chapters,
  exercises,
  flashcards,
  formulas,
  forumReplies,
  forumThreads,
  mockExams,
  moderationFlags,
  moderationWarnings,
  quizAttempts,
  quizQuestions,
  quizzes,
  revisionNotes,
  subjects,
  userProgress,
  users
} from "../lib/db/schema.js";
import { requireSession, type AuthenticatedRequest } from "../lib/session.js";
import { extractWikiLinks, normalizeWikiLinkTarget } from "../lib/wiki-links.js";
import { escapeLikePattern } from "../lib/escape-like.js";
import { getAllQueues, jobRegistry } from "../lib/queue.js";

const chapterParamsSchema = z.object({
  id: z.coerce.number().int().positive()
});

const curriculumEntityParamsSchema = z.object({
  id: z.coerce.number().int().positive()
});

const threadParamsSchema = z.object({
  threadId: z.string().uuid()
});

const chapterPublishBodySchema = z.object({
  isPublished: z.boolean()
});

const chapterSubpartCreateBodySchema = z.object({
  heading: z.string().trim().min(1),
  content: z.string().trim().min(1),
  orderIndex: z.coerce.number().int().positive().optional()
});

const chapterSubpartUpdateBodySchema = z.object({
  heading: z.string().trim().min(1),
  content: z.string().trim().min(1)
});

const chapterSubpartReorderBodySchema = z.object({
  subpartIds: z.array(z.coerce.number().int().positive()).min(1)
});

const chapterSubpartParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  subpartId: z.coerce.number().int().positive()
});

const revisionDefinitionSchema = z.object({
  term: z.string().trim().min(1),
  definition: z.string().trim().min(1)
});

const chapterRevisionNotesBodySchema = z.object({
  keyFormulas: z.array(z.string().trim().min(1)).default([]),
  keyDefinitions: z.array(revisionDefinitionSchema).default([]),
  commonMistakes: z.string().default(""),
  examTips: z.string().default("")
});

const chapterRenameBodySchema = z.object({
  title: z.string().trim().min(1),
  slug: z.string().trim().min(1)
});

const chapterLinkSuggestionQuerySchema = z.object({
  q: z.string().trim().optional().default(""),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20)
});

const chapterGraphQuerySchema = z.object({
  q: z.string().trim().optional().default("")
});

const threadPinBodySchema = z.object({
  isPinned: z.boolean()
});

const curriculumBoardCreateBodySchema = z.object({
  name: z.string().trim().min(2),
  slug: z.string().trim().min(2)
});

const curriculumBoardUpdateBodySchema = z.object({
  name: z.string().trim().min(2),
  slug: z.string().trim().min(2)
});

const curriculumClassCreateBodySchema = z.object({
  boardId: z.coerce.number().int().positive(),
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1)
});

const curriculumClassUpdateBodySchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1)
});

const curriculumSubjectCreateBodySchema = z.object({
  boardClassId: z.coerce.number().int().positive(),
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  icon: z.string().trim().optional(),
  description: z.string().trim().optional(),
  coverImageUrl: z.string().trim().url().nullish()
});

const curriculumSubjectUpdateBodySchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  icon: z.string().trim().nullish(),
  description: z.string().trim().nullish(),
  coverImageUrl: z.string().trim().url().nullish()
});

const curriculumChapterCreateBodySchema = z.object({
  subjectId: z.coerce.number().int().positive(),
  chapterNumber: z.coerce.number().int().positive(),
  title: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  isPublished: z.boolean().optional().default(false),
  coverImageUrl: z.string().trim().url().nullish()
});

const curriculumChapterUpdateBodySchema = z.object({
  chapterNumber: z.coerce.number().int().positive(),
  title: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  coverImageUrl: z.string().trim().url().nullish()
});

const blankStatementSchema = z.object({
  text: z.string().trim().min(1, "Statement text is required"),
  blanksAnswer: z.array(z.string().trim().min(1)).min(1, "At least one answer per statement is required")
});

export const curriculumExerciseCreateBodySchema = z
  .object({
    chapterId: z.coerce.number().int().positive(),
    exerciseNumber: z.string().trim().min(1),
    question: z.string().trim().optional(),
    solution: z.string().trim().optional(),
    difficulty: z.enum(["easy", "medium", "hard"]).optional().default("medium"),
    type: z.enum(["mcq", "short", "long", "numerical", "fill_in_blanks"]).optional().default("short"),
    problemMarkdown: z.string().trim().optional(),
    solutionCode: z.string().trim().optional(),
    visualizationHtml: z.string().trim().optional(),
    blanksAnswer: z.array(z.string()).optional(),
    statements: z.array(blankStatementSchema).optional()
  })
  .refine(
    (data) => {
      if (data.type !== "fill_in_blanks") {
        return data.question !== undefined && data.question.trim().length > 0;
      }
      return true;
    },
    {
      message: "Question is required",
      path: ["question"]
    }
  )
  .refine(
    (data) => {
      if (data.type !== "fill_in_blanks") {
        return data.solution !== undefined && data.solution.trim().length > 0;
      }
      return true;
    },
    {
      message: "Solution is required",
      path: ["solution"]
    }
  )
  .refine(
    (data) => {
      if (data.type === "numerical") {
        return (
          data.problemMarkdown !== undefined && data.problemMarkdown.trim().length > 0
        );
      }
      return true;
    },
    {
      message: "problemMarkdown is required when type is 'numerical'",
      path: ["problemMarkdown"]
    }
  )
  .refine(
    (data) => {
      if (data.type === "numerical") {
        return data.solutionCode !== undefined && data.solutionCode.trim().length > 0;
      }
      return true;
    },
    {
      message: "solutionCode is required when type is 'numerical'",
      path: ["solutionCode"]
    }
  )
  .refine(
    (data) => {
      if (data.type === "fill_in_blanks") {
        const hasStatements = data.statements !== undefined && data.statements.length > 0;
        const hasLegacyBlanks = data.blanksAnswer !== undefined && data.blanksAnswer.length > 0;
        return hasStatements || hasLegacyBlanks;
      }
      return true;
    },
    {
      message: "statements or blanksAnswer is required when type is 'fill_in_blanks'",
      path: ["statements"]
    }
  );

export const curriculumExerciseUpdateBodySchema = z
  .object({
    exerciseNumber: z.string().trim().min(1),
    question: z.string().trim().optional(),
    solution: z.string().trim().optional(),
    difficulty: z.enum(["easy", "medium", "hard"]).optional().default("medium"),
    type: z.enum(["mcq", "short", "long", "numerical", "fill_in_blanks"]).optional().default("short"),
    problemMarkdown: z.string().trim().optional(),
    solutionCode: z.string().trim().optional(),
    visualizationHtml: z.string().trim().optional(),
    blanksAnswer: z.array(z.string()).optional(),
    statements: z.array(blankStatementSchema).optional()
  })
  .refine(
    (data) => {
      if (data.type !== "fill_in_blanks") {
        return data.question !== undefined && data.question.trim().length > 0;
      }
      return true;
    },
    {
      message: "Question is required",
      path: ["question"]
    }
  )
  .refine(
    (data) => {
      if (data.type !== "fill_in_blanks") {
        return data.solution !== undefined && data.solution.trim().length > 0;
      }
      return true;
    },
    {
      message: "Solution is required",
      path: ["solution"]
    }
  )
  .refine(
    (data) => {
      if (data.type === "numerical") {
        return (
          data.problemMarkdown !== undefined && data.problemMarkdown.trim().length > 0
        );
      }
      return true;
    },
    {
      message: "problemMarkdown is required when type is 'numerical'",
      path: ["problemMarkdown"]
    }
  )
  .refine(
    (data) => {
      if (data.type === "numerical") {
        return data.solutionCode !== undefined && data.solutionCode.trim().length > 0;
      }
      return true;
    },
    {
      message: "solutionCode is required when type is 'numerical'",
      path: ["solutionCode"]
    }
  )
  .refine(
    (data) => {
      if (data.type === "fill_in_blanks") {
        const hasStatements = data.statements !== undefined && data.statements.length > 0;
        const hasLegacyBlanks = data.blanksAnswer !== undefined && data.blanksAnswer.length > 0;
        return hasStatements || hasLegacyBlanks;
      }
      return true;
    },
    {
      message: "statements or blanksAnswer is required when type is 'fill_in_blanks'",
      path: ["statements"]
    }
  );

const curriculumExerciseListQuerySchema = z.object({
  chapterId: z.coerce.number().int().positive().optional()
});

// Quiz schemas
const quizUpsertBodySchema = z.object({
  chapterId: z.coerce.number().int().positive(),
  title: z.string().trim().min(1),
  durationMinutes: z.coerce.number().int().positive().optional().default(30),
  type: z.enum(["chapter_quiz", "mock_exam"]).optional().default("chapter_quiz")
});

const quizUpdateBodySchema = z.object({
  title: z.string().trim().min(1),
  durationMinutes: z.coerce.number().int().positive().optional(),
  type: z.enum(["chapter_quiz", "mock_exam"]).optional()
});

const quizQuerySchema = z.object({
  chapterId: z.coerce.number().int().positive().optional()
});

const quizParamsSchema = z.object({
  id: z.coerce.number().int().positive()
});

// Quiz question schemas
const quizQuestionCreateBodySchema = z.object({
  quizId: z.coerce.number().int().positive(),
  chapterId: z.coerce.number().int().positive().optional(),
  question: z.string().trim().min(1),
  optionA: z.string().trim().min(1),
  optionB: z.string().trim().min(1),
  optionC: z.string().trim().min(1),
  optionD: z.string().trim().min(1),
  correctOption: z.enum(["a", "b", "c", "d"]),
  explanation: z.string().trim().optional(),
  marks: z.coerce.number().int().positive().optional().default(1)
});

const quizQuestionUpdateBodySchema = z.object({
  question: z.string().trim().min(1),
  optionA: z.string().trim().min(1),
  optionB: z.string().trim().min(1),
  optionC: z.string().trim().min(1),
  optionD: z.string().trim().min(1),
  correctOption: z.enum(["a", "b", "c", "d"]),
  explanation: z.string().trim().optional(),
  marks: z.coerce.number().int().positive().optional().default(1)
});

const quizQuestionListQuerySchema = z.object({
  quizId: z.coerce.number().int().positive()
});

const quizQuestionParamsSchema = z.object({
  id: z.coerce.number().int().positive()
});

// Flashcard schemas
const flashcardCreateBodySchema = z.object({
  chapterId: z.coerce.number().int().positive(),
  front: z.string().trim().min(1),
  back: z.string().trim().min(1),
  orderIndex: z.coerce.number().int().min(0).optional()
});

const flashcardUpdateBodySchema = z.object({
  front: z.string().trim().min(1).optional(),
  back: z.string().trim().min(1).optional()
});

const flashcardListQuerySchema = z.object({
  chapterId: z.coerce.number().int().positive()
});

const flashcardParamsSchema = z.object({
  id: z.coerce.number().int().positive()
});

const flashcardReorderBodySchema = z.object({
  chapterId: z.coerce.number().int().positive(),
  orderedIds: z.array(z.coerce.number().int().positive()).min(1)
});

// Formula schemas
const formulaVariableSchema = z.object({
  symbol: z.string().trim().min(1),
  meaning: z.string().trim().min(1)
});

const formulaCreateBodySchema = z.object({
  subjectId: z.coerce.number().int().positive(),
  chapterId: z.coerce.number().int().positive(),
  name: z.string().trim().min(1),
  formulaLatex: z.string().trim().min(1),
  description: z.string().trim().min(1),
  variables: z.array(formulaVariableSchema).default([]),
  tags: z.array(z.string().trim().min(1)).default([])
});

const formulaUpdateBodySchema = z.object({
  subjectId: z.coerce.number().int().positive().optional(),
  chapterId: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(1).optional(),
  formulaLatex: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
  variables: z.array(formulaVariableSchema).optional(),
  tags: z.array(z.string().trim().min(1)).optional()
});

const formulaListQuerySchema = z.object({
  subjectId: z.coerce.number().int().positive().optional(),
  chapterId: z.coerce.number().int().positive().optional()
});

// Past paper schemas
const pastPaperCreateBodySchema = z.object({
  title: z.string().trim().min(1),
  boardId: z.coerce.number().int().positive(),
  grade: z.enum(["9", "10"]),
  subjectId: z.coerce.number().int().positive(),
  year: z.coerce.number().int().min(2000).max(2099),
  paperContent: z.string().trim().optional(),
  solutionContent: z.string().trim().optional(),
  published: z.boolean().optional().default(false),
  description: z.string().trim().optional(),
  durationMinutes: z.coerce.number().int().min(0).optional().default(60),
  totalMarks: z.coerce.number().int().min(0).optional().default(0),
  exercises: z.array(z.object({
    exerciseId: z.coerce.number().int().positive(),
    orderIndex: z.coerce.number().int().min(0),
    marks: z.coerce.number().int().positive().optional()
  })).optional().default([])
});

const pastPaperUpdateBodySchema = z.object({
  title: z.string().trim().min(1).optional(),
  boardId: z.coerce.number().int().positive().optional(),
  grade: z.enum(["9", "10"]).optional(),
  subjectId: z.coerce.number().int().positive().optional(),
  year: z.coerce.number().int().min(2000).max(2099).optional(),
  paperContent: z.string().trim().min(1).optional(),
  solutionContent: z.string().trim().optional(),
  published: z.boolean().optional(),
  description: z.string().trim().optional(),
  durationMinutes: z.coerce.number().int().min(0).optional(),
  totalMarks: z.coerce.number().int().min(0).optional()
});

const pastPaperListQuerySchema = z.object({
  boardId: z.coerce.number().int().positive().optional(),
  grade: z.enum(["9", "10"]).optional(),
  subjectId: z.coerce.number().int().positive().optional(),
  year: z.coerce.number().int().min(2000).max(2099).optional()
});

const adminAuditScopeValues = ["content", "forum", "moderation", "notifications", "settings", "users"] as const;
const adminAuditStatusValues = ["success", "failed"] as const;

const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20)
});

const aggregatedAuditLogQuerySchema = z.object({
  scope: z.enum(["all", ...adminAuditScopeValues]).optional().default("all"),
  status: z.enum(["all", ...adminAuditStatusValues]).optional().default("all"),
  q: z.string().trim().optional().default(""),
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
  role: z.enum(["student", "admin", "moderator"]).optional(),
  status: z.enum(["active", "suspended"]).optional()
});

const adminUserParamsSchema = z.object({
  id: z.string().trim().min(1)
});

const adminUserRoleUpdateBodySchema = z.object({
  role: z.enum(["student", "admin", "moderator"])
});

const adminUserSuspensionBodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("suspend"),
    reason: z.string().trim().min(10)
  }),
  z.object({
    action: z.literal("reactivate"),
    reason: z.string().trim().optional()
  })
]);

const adminCommunityThreadsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  solved: z.enum(["all", "solved", "unsolved"]).optional().default("all"),
  pinned: z.enum(["all", "pinned", "unpinned"]).optional().default("all"),
  flagState: z.enum(["all", "openFlags", "noOpenFlags"]).optional().default("all")
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

type AdminAuditScope = (typeof adminAuditScopeValues)[number];
type AdminAuditStatus = (typeof adminAuditStatusValues)[number];

type ListAuditLogsInput = {
  scope?: AdminAuditScope;
  status?: AdminAuditStatus;
  q?: string;
  page: number;
  pageSize: number;
};

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

const inferLegacyGrade = (input: string): "9" | "10" | null => {
  const normalized = input.trim().toLowerCase();
  if (normalized === "9" || normalized === "9th" || normalized.includes("class 9")) {
    return "9";
  }
  if (normalized === "10" || normalized === "10th" || normalized.includes("class 10")) {
    return "10";
  }
  return null;
};

type ResolvedWikiLink = {
  targetTitle: string;
  normalizedTarget: string;
  targetSubpartId: number | null;
  isResolved: boolean;
};

type LinkResolutionCandidate = {
  subpartId: number;
  subjectId: number;
};

const ensureChapterTitleAlias = async ({
  chapterId,
  aliasTitle
}: {
  chapterId: number;
  aliasTitle: string;
}): Promise<void> => {
  const normalizedAlias = normalizeWikiLinkTarget(aliasTitle);
  if (!normalizedAlias) {
    return;
  }
  await db
    .insert(chapterTitleAliases)
    .values({
      chapterId,
      aliasTitle: aliasTitle.trim(),
      normalizedAlias
    })
    .onConflictDoNothing({
      target: [chapterTitleAliases.chapterId, chapterTitleAliases.normalizedAlias]
    });
};

const resolveWikiLinks = async ({
  sourceSubjectId,
  summary
}: {
  sourceSubjectId: number;
  summary: string;
}): Promise<ResolvedWikiLink[]> => {
  const parsedLinks = extractWikiLinks(summary);
  if (parsedLinks.length === 0) {
    return [];
  }

  const uniqueTargets = new Map<string, string>();
  for (const link of parsedLinks) {
    if (!uniqueTargets.has(link.normalizedTarget)) {
      uniqueTargets.set(link.normalizedTarget, link.targetTitle);
    }
  }

  const chapterRows = await db
    .select({
      id: chapters.id,
      title: chapters.title,
      subjectId: chapters.subjectId
    })
    .from(chapters);

  const subpartRows = await db
    .select({
      subpartId: chapterSubparts.id,
      chapterId: chapterSubparts.chapterId,
      heading: chapterSubparts.heading,
      subjectId: chapters.subjectId
    })
    .from(chapterSubparts)
    .innerJoin(chapters, eq(chapterSubparts.chapterId, chapters.id))
    .orderBy(asc(chapterSubparts.chapterId), asc(chapterSubparts.orderIndex), asc(chapterSubparts.id));

  const aliasRows = await db
    .select({
      chapterId: chapterTitleAliases.chapterId,
      normalizedAlias: chapterTitleAliases.normalizedAlias
    })
    .from(chapterTitleAliases);

  const chapterById = new Map<number, (typeof chapterRows)[number]>();
  const canonicalSubpartByChapter = new Map<number, LinkResolutionCandidate>();
  const candidateMap = new Map<string, LinkResolutionCandidate[]>();

  const pushCandidate = (normalizedTarget: string, candidate: LinkResolutionCandidate) => {
    const candidates = candidateMap.get(normalizedTarget) ?? [];
    if (!candidates.some((entry) => entry.subpartId === candidate.subpartId)) {
      candidates.push(candidate);
      candidateMap.set(normalizedTarget, candidates);
    }
  };

  for (const chapter of chapterRows) {
    chapterById.set(chapter.id, chapter);
  }

  for (const subpart of subpartRows) {
    if (!canonicalSubpartByChapter.has(subpart.chapterId)) {
      canonicalSubpartByChapter.set(subpart.chapterId, {
        subpartId: subpart.subpartId,
        subjectId: subpart.subjectId
      });
    }

    const normalizedHeading = normalizeWikiLinkTarget(subpart.heading);
    if (normalizedHeading.length > 0) {
      pushCandidate(normalizedHeading, {
        subpartId: subpart.subpartId,
        subjectId: subpart.subjectId
      });
    }
  }

  for (const chapter of chapterRows) {
    const canonicalSubpart = canonicalSubpartByChapter.get(chapter.id);
    if (!canonicalSubpart) {
      continue;
    }

    const normalizedTitle = normalizeWikiLinkTarget(chapter.title);
    if (normalizedTitle.length > 0) {
      pushCandidate(normalizedTitle, canonicalSubpart);
    }
  }

  for (const alias of aliasRows) {
    const chapter = chapterById.get(alias.chapterId);
    const canonicalSubpart = canonicalSubpartByChapter.get(alias.chapterId);
    if (!chapter || !canonicalSubpart) {
      continue;
    }

    if (alias.normalizedAlias.length > 0) {
      pushCandidate(alias.normalizedAlias, {
        subpartId: canonicalSubpart.subpartId,
        subjectId: chapter.subjectId
      });
    }
  }

  const resolvedLinks: ResolvedWikiLink[] = [];
  for (const [normalizedTarget, targetTitle] of uniqueTargets.entries()) {
    const candidates = candidateMap.get(normalizedTarget) ?? [];
    const preferredCandidate = candidates.find((candidate) => candidate.subjectId === sourceSubjectId) ?? candidates[0];
    resolvedLinks.push({
      targetTitle,
      normalizedTarget,
      targetSubpartId: preferredCandidate?.subpartId ?? null,
      isResolved: Boolean(preferredCandidate)
    });
  }
  return resolvedLinks;
};

const rebuildChapterSummaryLinks = async ({
  sourceChapterId,
  sourceSubjectId
}: {
  sourceChapterId: number;
  sourceSubjectId: number;
}): Promise<void> => {
  const sourceSubpartRows = await db
    .select({
      id: chapterSubparts.id,
      content: chapterSubparts.content
    })
    .from(chapterSubparts)
    .where(eq(chapterSubparts.chapterId, sourceChapterId))
    .orderBy(asc(chapterSubparts.orderIndex), asc(chapterSubparts.id));

  const sourceSubpartIds = sourceSubpartRows.map((subpart) => subpart.id);
  if (sourceSubpartIds.length === 0) {
    return;
  }

  await db.delete(chapterSummaryLinks).where(inArray(chapterSummaryLinks.sourceSubpartId, sourceSubpartIds));

  const insertRows: Array<{
    sourceSubpartId: number;
    targetSubpartId: number | null;
    targetTitle: string;
    normalizedTarget: string;
    isResolved: boolean;
    updatedAt: Date;
  }> = [];

  for (const subpart of sourceSubpartRows) {
    const resolvedLinks = await resolveWikiLinks({
      sourceSubjectId,
      summary: subpart.content
    });

    for (const link of resolvedLinks) {
      insertRows.push({
        sourceSubpartId: subpart.id,
        targetSubpartId: link.targetSubpartId,
        targetTitle: link.targetTitle,
        normalizedTarget: link.normalizedTarget,
        isResolved: link.isResolved,
        updatedAt: new Date()
      });
    }
  }

  if (insertRows.length === 0) {
    return;
  }

  await db.insert(chapterSummaryLinks).values(insertRows);
};

const rebuildInboundChapterLinks = async ({
  targetChapterId
}: {
  targetChapterId: number;
}): Promise<void> => {
  // Find all subparts that belong to the target chapter
  const targetSubpartRows = await db
    .select({
      id: chapterSubparts.id
    })
    .from(chapterSubparts)
    .where(eq(chapterSubparts.chapterId, targetChapterId));

  const targetSubpartIds = targetSubpartRows.map((subpart) => subpart.id);
  if (targetSubpartIds.length === 0) {
    return;
  }

  const aliasRows = await db
    .select({
      normalizedAlias: chapterTitleAliases.normalizedAlias
    })
    .from(chapterTitleAliases)
    .where(eq(chapterTitleAliases.chapterId, targetChapterId));
  const normalizedAliases = aliasRows.map((row) => row.normalizedAlias);

  const inboundLinksPredicate =
    normalizedAliases.length > 0
      ? or(
          inArray(chapterSummaryLinks.targetSubpartId, targetSubpartIds),
          and(isNull(chapterSummaryLinks.targetSubpartId), inArray(chapterSummaryLinks.normalizedTarget, normalizedAliases))
        )
      : inArray(chapterSummaryLinks.targetSubpartId, targetSubpartIds);

  // Find all chapters that have links pointing to any of the target subparts
  const inboundLinkRows = await db
    .select({
      sourceSubpartId: chapterSummaryLinks.sourceSubpartId
    })
    .from(chapterSummaryLinks)
    .where(inboundLinksPredicate);

  if (inboundLinkRows.length === 0) {
    return;
  }

  const sourceSubpartIds = inboundLinkRows.map((link) => link.sourceSubpartId);

  // Get the chapters that own these source subparts
  const sourceChapterRows = await db
    .select({
      chapterId: chapterSubparts.chapterId,
      subjectId: chapters.subjectId
    })
    .from(chapterSubparts)
    .innerJoin(chapters, eq(chapterSubparts.chapterId, chapters.id))
    .where(inArray(chapterSubparts.id, sourceSubpartIds));

  // Get unique chapters
  const uniqueSourceChapters = Array.from(
    new Map(
      sourceChapterRows.map((row) => [row.chapterId, { chapterId: row.chapterId, subjectId: row.subjectId }])
    ).values()
  );

  // Rebuild links for each source chapter
  for (const { chapterId, subjectId } of uniqueSourceChapters) {
    await rebuildChapterSummaryLinks({
      sourceChapterId: chapterId,
      sourceSubjectId: subjectId
    });

    // Invalidate cache for inbound chapters
    await cacheService.delete(CacheKeys.chapterContent(chapterId));
  }
};

const refreshLinksForChapterAliases = async ({
  chapterId
}: {
  chapterId: number;
}): Promise<void> => {
  const chapterSubpartRows = await db
    .select({
      id: chapterSubparts.id
    })
    .from(chapterSubparts)
    .where(eq(chapterSubparts.chapterId, chapterId))
    .orderBy(asc(chapterSubparts.orderIndex), asc(chapterSubparts.id));

  const chapterSubpartIds = chapterSubpartRows.map((entry) => entry.id);
  if (chapterSubpartIds.length === 0) {
    return;
  }

  const canonicalSubpartId = chapterSubpartIds[0];

  const aliasRows = await db
    .select({
      normalizedAlias: chapterTitleAliases.normalizedAlias
    })
    .from(chapterTitleAliases)
    .where(eq(chapterTitleAliases.chapterId, chapterId));
  const normalizedAliases = aliasRows.map((entry) => entry.normalizedAlias);
  if (normalizedAliases.length === 0) {
    return;
  }

  await db
    .update(chapterSummaryLinks)
    .set({
      targetSubpartId: canonicalSubpartId,
      isResolved: true,
      updatedAt: new Date()
    })
    .where(
      and(
        inArray(chapterSummaryLinks.normalizedTarget, normalizedAliases),
        or(
          inArray(chapterSummaryLinks.targetSubpartId, chapterSubpartIds),
          isNull(chapterSummaryLinks.targetSubpartId)
        )
      )
    );
};

const listAuditLogs = async ({ scope, status, q, page, pageSize }: ListAuditLogsInput) => {
  const offset = (page - 1) * pageSize;
  const searchTerm = q?.trim() ?? "";
  const predicates: SQL[] = [];

  if (scope) {
    predicates.push(eq(adminAuditLogs.scope, scope));
  }
  if (status) {
    predicates.push(eq(adminAuditLogs.status, status));
  }
  if (searchTerm.length > 0) {
    const escaped = escapeLikePattern(searchTerm);
    const searchPredicate = or(
      ilike(adminAuditLogs.action, `%${escaped}%`),
      ilike(adminAuditLogs.target, `%${escaped}%`),
      ilike(adminAuditLogs.message, `%${escaped}%`),
      ilike(adminAuditLogs.actorName, `%${escaped}%`)
    );
    if (searchPredicate) {
      predicates.push(searchPredicate);
    }
  }
  const whereClause = predicates.length > 0 ? and(...predicates) : undefined;

  const rows = await db
    .select({
      id: adminAuditLogs.id,
      scope: adminAuditLogs.scope,
      action: adminAuditLogs.action,
      target: adminAuditLogs.target,
      status: adminAuditLogs.status,
      message: adminAuditLogs.message,
      actorId: adminAuditLogs.actorId,
      actorName: adminAuditLogs.actorName,
      createdAt: adminAuditLogs.createdAt
    })
    .from(adminAuditLogs)
    .where(whereClause)
    .orderBy(desc(adminAuditLogs.createdAt), desc(adminAuditLogs.id))
    .offset(offset)
    .limit(pageSize);

  const totalRows = await db
    .select({
      count: sql<number>`count(*)::int`
    })
    .from(adminAuditLogs)
    .where(whereClause);

  const total = totalRows[0]?.count ?? 0;

  return {
    entries: rows.map((row) => ({
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
  const payload = await listAuditLogs({ scope, page, pageSize });

  res.status(200).json({
    entries: payload.entries,
    total: payload.total,
    page,
    pageSize,
    hasMore: payload.hasMore
  });
};

const handleAggregatedAuditLogRead = async (req: AuthenticatedRequest, res: Response) => {
  if (!(await requireAdminRole(req, res))) {
    return;
  }

  const parsedQuery = aggregatedAuditLogQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({
      error: "Invalid aggregated audit log query parameters",
      details: parsedQuery.error.flatten()
    });
    return;
  }

  const { scope, status, q, page, pageSize } = parsedQuery.data;
  const payload = await listAuditLogs({
    ...(scope !== "all" ? { scope } : {}),
    ...(status !== "all" ? { status } : {}),
    ...(q.length > 0 ? { q } : {}),
    page,
    pageSize
  });

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
  role,
  status
}: {
  page: number;
  pageSize: number;
  q: string;
  role?: "student" | "admin" | "moderator";
  status?: "active" | "suspended";
}) => {
  const offset = (page - 1) * pageSize;
  const searchTerm = q.trim();
  const rolePredicate = role ? eq(users.role, role) : undefined;
  const statusPredicate = status ? eq(users.status, status) : undefined;
  const searchPredicate =
    searchTerm.length > 0
      ? or(
          ilike(users.name, `%${escapeLikePattern(searchTerm)}%`),
          ilike(users.email, `%${escapeLikePattern(searchTerm)}%`)
        )
      : undefined;
  const predicates = [rolePredicate, statusPredicate, searchPredicate].filter((value): value is SQL => Boolean(value));
  const whereClause = predicates.length > 0 ? and(...predicates) : undefined;

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      suspendedUntil: users.suspendedUntil,
      suspendedAt: users.suspendedAt,
      suspendedReason: users.suspendedReason,
      suspendedBy: users.suspendedBy,
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
      status: row.status,
      suspendedUntil: row.suspendedUntil?.toISOString() ?? null,
      suspendedAt: row.suspendedAt ? row.suspendedAt.toISOString() : null,
      suspendedReason: row.suspendedReason,
      suspendedBy: row.suspendedBy,
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

adminRouter.post("/moderation/threads/:threadId/edit", requireSession, async (req, res) => {
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

adminRouter.post("/moderation/threads/:threadId/delete", requireSession, async (req, res) => {
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

adminRouter.post("/moderation/replies/:replyId/edit", requireSession, async (req, res) => {
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

adminRouter.post("/moderation/replies/:replyId/delete", requireSession, async (req, res) => {
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

adminRouter.get("/users", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireStaffRole(authedReq, res))) {
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

  const { page, pageSize, q, role, status } = parsedQuery.data;
  const payload = await listAdminUsers({
    page,
    pageSize,
    q,
    ...(role ? { role } : {}),
    ...(status ? { status } : {})
  });

  res.status(200).json({
    entries: payload.entries,
    total: payload.total,
    page,
    pageSize,
    hasMore: payload.hasMore
  });
});

adminRouter.post("/users/:id/role", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedParams = adminUserParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid user identifier",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const parsedBody = adminUserRoleUpdateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid role update payload",
      details: parsedBody.error.flatten()
    });
    return;
  }

  const targetUserId = parsedParams.data.id;
  if (targetUserId === authedReq.session.user.id) {
    res.status(409).json({
      error: "Self role mutation is not allowed"
    });
    return;
  }

  const targetRows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt
    })
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1);

  const target = targetRows[0];
  if (!target) {
    res.status(404).json({
      error: "User not found"
    });
    return;
  }

  if (target.role === parsedBody.data.role) {
    res.status(409).json({
      error: "User already has this role"
    });
    return;
  }

  const updatedRows = await db
    .update(users)
    .set({
      role: parsedBody.data.role,
      updatedAt: new Date()
    })
    .where(eq(users.id, target.id))
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt
    });

  const updated = updatedRows[0];
  if (!updated) {
    res.status(404).json({
      error: "User not found"
    });
    return;
  }

  await persistAuditLog({
    scope: "users",
    action: parsedBody.data.role === "admin" ? "Promote user role" : "Demote user role",
    target: `${updated.name} <${updated.email}>`,
    status: "success",
    message: `Updated role to ${updated.role}`,
    actorId: authedReq.session.user.id,
    actorName: authedReq.session.user.name
  });

  res.status(200).json({
    user: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      createdAt: updated.createdAt.toISOString()
    }
  });
});

adminRouter.post("/users/:id/suspension", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedParams = adminUserParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid user identifier",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const parsedBody = adminUserSuspensionBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid suspension update payload",
      details: parsedBody.error.flatten()
    });
    return;
  }

  const targetUserId = parsedParams.data.id;
  if (targetUserId === authedReq.session.user.id) {
    res.status(409).json({
      error: "Self suspension mutation is not allowed"
    });
    return;
  }

  const targetRows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      suspendedAt: users.suspendedAt,
      suspendedReason: users.suspendedReason,
      suspendedBy: users.suspendedBy,
      createdAt: users.createdAt
    })
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1);

  const target = targetRows[0];
  if (!target) {
    res.status(404).json({
      error: "User not found"
    });
    return;
  }

  if (target.role !== "student") {
    res.status(409).json({
      error: "Only student users can be suspended or reactivated"
    });
    return;
  }

  const action = parsedBody.data.action;
  if (action === "suspend" && target.status === "suspended") {
    res.status(409).json({
      error: "User is already suspended"
    });
    return;
  }

  if (action === "reactivate" && target.status === "active") {
    res.status(409).json({
      error: "User is already active"
    });
    return;
  }

  const now = new Date();
  const updateSet =
    action === "suspend"
      ? {
          status: "suspended" as const,
          suspendedAt: now,
          suspendedReason: parsedBody.data.reason.trim(),
          suspendedBy: authedReq.session.user.id,
          updatedAt: now
        }
      : {
          status: "active" as const,
          suspendedAt: null,
          suspendedReason: null,
          suspendedBy: null,
          updatedAt: now
        };

  const updatedRows = await db
    .update(users)
    .set(updateSet)
    .where(eq(users.id, target.id))
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      suspendedAt: users.suspendedAt,
      suspendedReason: users.suspendedReason,
      suspendedBy: users.suspendedBy,
      createdAt: users.createdAt
    });

  const updated = updatedRows[0];
  if (!updated) {
    res.status(404).json({
      error: "User not found"
    });
    return;
  }

  await persistAuditLog({
    scope: "users",
    action: action === "suspend" ? "Suspend user" : "Reactivate user",
    target: `${updated.name} <${updated.email}>`,
    status: "success",
    message:
      action === "suspend"
        ? `Suspended user: ${updated.suspendedReason ?? "No reason supplied."}`
        : "Reactivated user.",
    actorId: authedReq.session.user.id,
    actorName: authedReq.session.user.name
  });

  res.status(200).json({
    user: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      status: updated.status,
      suspendedAt: updated.suspendedAt ? updated.suspendedAt.toISOString() : null,
      suspendedReason: updated.suspendedReason,
      suspendedBy: updated.suspendedBy,
      createdAt: updated.createdAt.toISOString()
    }
  });
});

adminRouter.post("/moderation/users/:id/warn", requireSession, async (req, res) => {
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

adminRouter.post("/moderation/users/:id/temp-ban", requireSession, async (req, res) => {
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

adminRouter.get("/moderation/user-history/:id", requireSession, async (req, res) => {
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

adminRouter.get("/community/threads", requireSession, async (req, res) => {
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

adminRouter.get("/overview", requireSession, async (req, res) => {
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

adminRouter.get("/moderator/overview", requireSession, async (req, res) => {
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

adminRouter.get("/content/curriculum", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const boardRows = await db
    .select({
      id: boards.id,
      name: boards.name,
      slug: boards.slug
    })
    .from(boards)
    .orderBy(asc(boards.name));

  const classRows = await db
    .select({
      id: boardClasses.id,
      boardId: boardClasses.boardId,
      name: boardClasses.name,
      slug: boardClasses.slug
    })
    .from(boardClasses)
    .orderBy(asc(boardClasses.name));

  const subjectRows = await db
    .select({
      id: subjects.id,
      boardClassId: subjects.boardClassId,
      name: subjects.name,
      slug: subjects.slug,
      icon: subjects.icon,
      description: subjects.description,
      coverImageUrl: subjects.coverImageUrl
    })
    .from(subjects)
    .where(sql`${subjects.boardClassId} is not null`)
    .orderBy(asc(subjects.name));

  const chapterRows = await db
    .select({
      id: chapters.id,
      subjectId: chapters.subjectId,
      chapterNumber: chapters.chapterNumber,
      title: chapters.title,
      slug: chapters.slug,
      isPublished: chapters.isPublished,
      coverImageUrl: chapters.coverImageUrl
    })
    .from(chapters)
    .orderBy(asc(chapters.chapterNumber));

  const chaptersBySubjectId = new Map<number, Array<(typeof chapterRows)[number]>>();
  for (const chapter of chapterRows) {
    const chapterList = chaptersBySubjectId.get(chapter.subjectId) ?? [];
    chapterList.push(chapter);
    chaptersBySubjectId.set(chapter.subjectId, chapterList);
  }

  const subjectsByClassId = new Map<number, Array<(typeof subjectRows)[number]>>();
  for (const subject of subjectRows) {
    if (!subject.boardClassId) {
      continue;
    }
    const subjectList = subjectsByClassId.get(subject.boardClassId) ?? [];
    subjectList.push(subject);
    subjectsByClassId.set(subject.boardClassId, subjectList);
  }

  const classesByBoardId = new Map<number, Array<(typeof classRows)[number]>>();
  for (const boardClass of classRows) {
    const classList = classesByBoardId.get(boardClass.boardId) ?? [];
    classList.push(boardClass);
    classesByBoardId.set(boardClass.boardId, classList);
  }

  const tree = boardRows.map((board) => ({
    id: board.id,
    name: board.name,
    slug: board.slug,
    classes: (classesByBoardId.get(board.id) ?? []).map((boardClass) => ({
      id: boardClass.id,
      name: boardClass.name,
      slug: boardClass.slug,
      subjects: (subjectsByClassId.get(boardClass.id) ?? []).map((subject) => ({
        id: subject.id,
        name: subject.name,
        slug: subject.slug,
        icon: subject.icon,
        description: subject.description,
        coverImageUrl: subject.coverImageUrl,
        chapters: (chaptersBySubjectId.get(subject.id) ?? []).map((chapter) => ({
          id: chapter.id,
          chapterNumber: chapter.chapterNumber,
          title: chapter.title,
          slug: chapter.slug,
          isPublished: chapter.isPublished,
          coverImageUrl: chapter.coverImageUrl
        }))
      }))
    }))
  }));

  res.status(200).json({
    boards: tree
  });
});

adminRouter.post("/content/boards", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedBody = curriculumBoardCreateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid board payload",
      details: parsedBody.error.flatten()
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
        slug
      })
      .returning({
        id: boards.id,
        name: boards.name,
        slug: boards.slug
      });

    const board = insertedRows[0];
    if (!board) {
      res.status(500).json({
        error: "Failed to create board"
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
      actorName
    });

    // Purge cached curriculum data
    void cacheService.invalidatePattern("learn:*");
    void cacheService.delete(CacheKeys.subjectList());

    res.status(201).json({
      board
    });
  } catch {
    await persistAuditLog({
      scope: "content",
      action: "Create board",
      target: name,
      status: "failed",
      message: "Board create failed",
      actorId,
      actorName
    });
    res.status(409).json({
      error: "Board already exists"
    });
  }
});

adminRouter.post("/content/classes", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedBody = curriculumClassCreateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid class payload",
      details: parsedBody.error.flatten()
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
      name: boards.name
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
      actorName
    });
    res.status(404).json({
      error: "Board not found"
    });
    return;
  }

  try {
    const insertedRows = await db
      .insert(boardClasses)
      .values({
        boardId: board.id,
        name,
        slug
      })
      .returning({
        id: boardClasses.id,
        boardId: boardClasses.boardId,
        name: boardClasses.name,
        slug: boardClasses.slug
      });

    const boardClass = insertedRows[0];
    if (!boardClass) {
      res.status(500).json({
        error: "Failed to create class"
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
      actorName
    });

    // Purge cached curriculum data
    void cacheService.invalidatePattern("learn:*");

    res.status(201).json({
      class: boardClass
    });
  } catch {
    await persistAuditLog({
      scope: "content",
      action: "Create class",
      target: `${board.name} / ${name}`,
      status: "failed",
      message: "Class create failed",
      actorId,
      actorName
    });
    res.status(409).json({
      error: "Class already exists for board"
    });
  }
});

adminRouter.post("/content/subjects", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedBody = curriculumSubjectCreateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid subject payload",
      details: parsedBody.error.flatten()
    });
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;
  const name = parsedBody.data.name.trim();
  const slug = parsedBody.data.slug.trim().toLowerCase();

  const classRows = await db
    .select({
      id: boardClasses.id,
      boardId: boardClasses.boardId,
      name: boardClasses.name,
      slug: boardClasses.slug
    })
    .from(boardClasses)
    .where(eq(boardClasses.id, parsedBody.data.boardClassId))
    .limit(1);

  const boardClass = classRows[0];
  if (!boardClass) {
    await persistAuditLog({
      scope: "content",
      action: "Create subject",
      target: `${name} (${slug})`,
      status: "failed",
      message: "Class not found",
      actorId,
      actorName
    });
    res.status(404).json({
      error: "Class not found"
    });
    return;
  }

  const legacyGrade = inferLegacyGrade(`${boardClass.slug} ${boardClass.name}`);
  try {
    const insertedRows = await db
      .insert(subjects)
      .values({
        boardId: boardClass.boardId,
        boardClassId: boardClass.id,
        grade: legacyGrade,
        name,
        slug,
        ...(parsedBody.data.icon ? { icon: parsedBody.data.icon.trim() } : {}),
        ...(parsedBody.data.description ? { description: parsedBody.data.description.trim() } : {}),
        ...(parsedBody.data.coverImageUrl ? { coverImageUrl: parsedBody.data.coverImageUrl } : {})
      })
      .returning({
        id: subjects.id,
        boardClassId: subjects.boardClassId,
        name: subjects.name,
        slug: subjects.slug,
        icon: subjects.icon,
        description: subjects.description,
        coverImageUrl: subjects.coverImageUrl
      });

    const subject = insertedRows[0];
    if (!subject) {
      res.status(500).json({
        error: "Failed to create subject"
      });
      return;
    }

    await persistAuditLog({
      scope: "content",
      action: "Create subject",
      target: `${boardClass.name} / ${subject.name}`,
      status: "success",
      message: `Created subject ${subject.slug}`,
      actorId,
      actorName
    });

    // Purge cached subject lists
    void cacheService.delete(CacheKeys.subjectList());
    void cacheService.invalidatePattern("learn:*");

    res.status(201).json({
      subject
    });
  } catch {
    await persistAuditLog({
      scope: "content",
      action: "Create subject",
      target: `${boardClass.name} / ${name}`,
      status: "failed",
      message: "Subject create failed",
      actorId,
      actorName
    });
    res.status(409).json({
      error: "Subject already exists for class"
    });
  }
});

adminRouter.post("/content/chapters", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedBody = curriculumChapterCreateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid chapter payload",
      details: parsedBody.error.flatten()
    });
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;
  const title = parsedBody.data.title.trim();
  const slug = parsedBody.data.slug.trim().toLowerCase();

  const subjectRows = await db
    .select({
      id: subjects.id,
      name: subjects.name
    })
    .from(subjects)
    .where(eq(subjects.id, parsedBody.data.subjectId))
    .limit(1);

  const subject = subjectRows[0];
  if (!subject) {
    await persistAuditLog({
      scope: "content",
      action: "Create chapter",
      target: `${title} (${slug})`,
      status: "failed",
      message: "Subject not found",
      actorId,
      actorName
    });
    res.status(404).json({
      error: "Subject not found"
    });
    return;
  }

  try {
    const insertedRows = await db
      .insert(chapters)
      .values({
        subjectId: subject.id,
        chapterNumber: parsedBody.data.chapterNumber,
        title,
        slug,
        isPublished: parsedBody.data.isPublished,
        coverImageUrl: parsedBody.data.coverImageUrl ?? null
      })
      .returning({
        id: chapters.id,
        subjectId: chapters.subjectId,
        chapterNumber: chapters.chapterNumber,
        title: chapters.title,
        slug: chapters.slug,
        isPublished: chapters.isPublished
      });

    const chapter = insertedRows[0];
    if (!chapter) {
      res.status(500).json({
        error: "Failed to create chapter"
      });
      return;
    }

    await ensureChapterTitleAlias({
      chapterId: chapter.id,
      aliasTitle: chapter.title
    });
    await rebuildChapterSummaryLinks({
      sourceChapterId: chapter.id,
      sourceSubjectId: subject.id
    });

    await persistAuditLog({
      scope: "content",
      action: "Create chapter",
      target: `${subject.name} / ${chapter.title}`,
      status: "success",
      message: `Created chapter ${chapter.slug}`,
      actorId,
      actorName
    });

    // Purge cached chapter lists for this subject
    void cacheService.delete(CacheKeys.chapterList(subject.id));

    res.status(201).json({
      chapter
    });
  } catch {
    await persistAuditLog({
      scope: "content",
      action: "Create chapter",
      target: `${subject.name} / ${title}`,
      status: "failed",
      message: "Chapter create failed",
      actorId,
      actorName
    });
    res.status(409).json({
      error: "Chapter already exists for subject"
    });
  }
});

adminRouter.post("/content/exercises", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedBody = curriculumExerciseCreateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid exercise payload",
      details: parsedBody.error.flatten()
    });
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;
  const exerciseNumber = parsedBody.data.exerciseNumber.trim();

  const chapterRows = await db
    .select({
      id: chapters.id,
      title: chapters.title,
      subjectId: chapters.subjectId,
      subjectName: subjects.name
    })
    .from(chapters)
    .innerJoin(subjects, eq(chapters.subjectId, subjects.id))
    .where(eq(chapters.id, parsedBody.data.chapterId))
    .limit(1);

  const chapter = chapterRows[0];
  if (!chapter) {
    await persistAuditLog({
      scope: "content",
      action: "Create exercise",
      target: `Chapter #${parsedBody.data.chapterId} / ${exerciseNumber}`,
      status: "failed",
      message: "Chapter not found",
      actorId,
      actorName
    });
    res.status(404).json({
      error: "Chapter not found"
    });
    return;
  }

  const isPhysicsChapter = chapter.subjectName.toLowerCase().includes("physics");
  if (parsedBody.data.type === "numerical" && !isPhysicsChapter) {
    await persistAuditLog({
      scope: "content",
      action: "Create exercise",
      target: `${chapter.subjectName} / ${chapter.title} / ${exerciseNumber}`,
      status: "failed",
      message: "Numerical exercises are only allowed for Physics chapters",
      actorId,
      actorName
    });
    res.status(400).json({
      error: "Numerical problems are only allowed for Physics chapters"
    });
    return;
  }

  try {
    const insertedRows = await db
      .insert(exercises)
      .values({
        chapterId: chapter.id,
        exerciseNumber,
        question: parsedBody.data.question?.trim() || "Fill in the Blanks",
        solution: parsedBody.data.solution?.trim() || "See statements below",
        difficulty: parsedBody.data.difficulty,
        type: parsedBody.data.type,
        problemMarkdown: parsedBody.data.problemMarkdown?.trim() || null,
        solutionCode: parsedBody.data.solutionCode?.trim() || null,
        visualizationHtml: parsedBody.data.type === "numerical"
          ? (parsedBody.data.visualizationHtml?.trim() || null)
          : null,
        blanksAnswer: parsedBody.data.type === "fill_in_blanks"
          ? (parsedBody.data.blanksAnswer ?? null)
          : null,
        statements: parsedBody.data.type === "fill_in_blanks"
          ? (parsedBody.data.statements ?? null)
          : null
      })
      .returning({
        id: exercises.id,
        chapterId: exercises.chapterId,
        exerciseNumber: exercises.exerciseNumber,
        question: exercises.question,
        solution: exercises.solution,
        difficulty: exercises.difficulty,
        type: exercises.type,
        problemMarkdown: exercises.problemMarkdown,
        solutionCode: exercises.solutionCode,
        visualizationHtml: exercises.visualizationHtml,
        blanksAnswer: exercises.blanksAnswer,
        statements: exercises.statements
      });

    const exercise = insertedRows[0];
    if (!exercise) {
      res.status(500).json({
        error: "Failed to create exercise"
      });
      return;
    }

    // Invalidate chapter content cache (exercises are part of chapter content)
    await cacheService.delete(CacheKeys.chapterContent(chapter.id));

    await persistAuditLog({
      scope: "content",
      action: "Create exercise",
      target: `${chapter.subjectName} / ${chapter.title} / ${exercise.exerciseNumber}`,
      status: "success",
      message: `Created ${exercise.type} exercise`,
      actorId,
      actorName
    });

    res.status(201).json({
      exercise
    });
  } catch {
    await persistAuditLog({
      scope: "content",
      action: "Create exercise",
      target: `${chapter.subjectName} / ${chapter.title} / ${exerciseNumber}`,
      status: "failed",
      message: "Exercise create failed",
      actorId,
      actorName
    });
    res.status(409).json({
      error: "Exercise already exists for chapter"
    });
  }
});

adminRouter.get("/content/exercises", requireSession, async (req, res) => {
  const parsedQuery = curriculumExerciseListQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({
      error: "Invalid exercise query",
      details: parsedQuery.error.flatten()
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const exerciseRows = await db
    .select({
      id: exercises.id,
      chapterId: exercises.chapterId,
      chapterTitle: chapters.title,
      subjectName: subjects.name,
      exerciseNumber: exercises.exerciseNumber,
      question: exercises.question,
      solution: exercises.solution,
      difficulty: exercises.difficulty,
      type: exercises.type,
      problemMarkdown: exercises.problemMarkdown,
      solutionCode: exercises.solutionCode,
      visualizationHtml: exercises.visualizationHtml,
      blanksAnswer: exercises.blanksAnswer,
      statements: exercises.statements
    })
    .from(exercises)
    .innerJoin(chapters, eq(exercises.chapterId, chapters.id))
    .innerJoin(subjects, eq(chapters.subjectId, subjects.id))
    .where(parsedQuery.data.chapterId ? eq(exercises.chapterId, parsedQuery.data.chapterId) : undefined)
    .orderBy(asc(exercises.chapterId), asc(exercises.exerciseNumber));

  res.status(200).json({
    exercises: exerciseRows
  });
});

adminRouter.post("/content/boards/:id/update", requireSession, async (req, res) => {
  const parsedParams = curriculumEntityParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid board identifier",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const parsedBody = curriculumBoardUpdateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid board payload",
      details: parsedBody.error.flatten()
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
      slug: boards.slug
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
      actorName
    });
    res.status(404).json({
      error: "Board not found"
    });
    return;
  }

  try {
    const updatedRows = await db
      .update(boards)
      .set({
        name: parsedBody.data.name.trim(),
        slug: parsedBody.data.slug.trim().toLowerCase()
      })
      .where(eq(boards.id, board.id))
      .returning({
        id: boards.id,
        name: boards.name,
        slug: boards.slug
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
        actorName
      });
      res.status(404).json({
        error: "Board not found"
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
      actorName
    });

    // Purge cached curriculum data
    void cacheService.invalidatePattern("learn:*");
    void cacheService.delete(CacheKeys.subjectList());

    res.status(200).json({
      board: updatedBoard,
      timestamp: new Date().toISOString()
    });
  } catch {
    await persistAuditLog({
      scope: "content",
      action,
      target: board.name,
      status: "failed",
      message: "Board update failed",
      actorId,
      actorName
    });
    res.status(409).json({
      error: "Board already exists"
    });
  }
});

adminRouter.post("/content/boards/:id/delete", requireSession, async (req, res) => {
  const parsedParams = curriculumEntityParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid board identifier",
      details: parsedParams.error.flatten()
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
      slug: boards.slug
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
      actorName
    });
    res.status(404).json({
      error: "Board not found"
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
      actorName
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
    actorName
  });

  // Purge cached curriculum data
  void cacheService.invalidatePattern("learn:*");
  void cacheService.delete(CacheKeys.subjectList());
  void cacheService.invalidatePattern("chapters:list:*");

  res.status(200).json({
    board,
    timestamp: new Date().toISOString()
  });
});

adminRouter.post("/content/classes/:id/update", requireSession, async (req, res) => {
  const parsedParams = curriculumEntityParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid class identifier",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const parsedBody = curriculumClassUpdateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid class payload",
      details: parsedBody.error.flatten()
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
      boardName: boards.name
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
      actorName
    });
    res.status(404).json({
      error: "Class not found"
    });
    return;
  }

  try {
    const updatedRows = await db
      .update(boardClasses)
      .set({
        name: parsedBody.data.name.trim(),
        slug: parsedBody.data.slug.trim().toLowerCase()
      })
      .where(eq(boardClasses.id, boardClass.id))
      .returning({
        id: boardClasses.id,
        boardId: boardClasses.boardId,
        name: boardClasses.name,
        slug: boardClasses.slug
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
        actorName
      });
      res.status(404).json({
        error: "Class not found"
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
      actorName
    });

    // Purge cached curriculum data
    void cacheService.invalidatePattern("learn:*");

    res.status(200).json({
      class: updatedClass,
      timestamp: new Date().toISOString()
    });
  } catch {
    await persistAuditLog({
      scope: "content",
      action,
      target: `${boardClass.boardName} / ${boardClass.name}`,
      status: "failed",
      message: "Class update failed",
      actorId,
      actorName
    });
    res.status(409).json({
      error: "Class already exists for board"
    });
  }
});

adminRouter.post("/content/classes/:id/delete", requireSession, async (req, res) => {
  const parsedParams = curriculumEntityParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid class identifier",
      details: parsedParams.error.flatten()
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
      boardName: boards.name
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
      actorName
    });
    res.status(404).json({
      error: "Class not found"
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
      actorName
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
    actorName
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
      slug: boardClass.slug
    },
    timestamp: new Date().toISOString()
  });
});

adminRouter.post("/content/subjects/:id/delete", requireSession, async (req, res) => {
  const parsedParams = curriculumEntityParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid subject identifier",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;
  const action = "Delete subject";
  const fallbackTarget = `Subject #${parsedParams.data.id}`;

  const subjectRows = await db
    .select({
      id: subjects.id,
      name: subjects.name,
      slug: subjects.slug,
      boardClassId: subjects.boardClassId,
      className: boardClasses.name,
      boardName: boards.name
    })
    .from(subjects)
    .leftJoin(boardClasses, eq(subjects.boardClassId, boardClasses.id))
    .innerJoin(boards, eq(subjects.boardId, boards.id))
    .where(eq(subjects.id, parsedParams.data.id))
    .limit(1);
  const subject = subjectRows[0];
  if (!subject) {
    await persistAuditLog({
      scope: "content",
      action,
      target: fallbackTarget,
      status: "failed",
      message: "Subject not found",
      actorId,
      actorName
    });
    res.status(404).json({
      error: "Subject not found"
    });
    return;
  }

  try {
    await db.delete(subjects).where(eq(subjects.id, subject.id));
  } catch (error) {
    await persistAuditLog({
      scope: "content",
      action,
      target: `${subject.boardName} / ${subject.className || "unassigned"} / ${subject.name}`,
      status: "failed",
      message: error instanceof Error ? error.message : "Subject delete failed",
      actorId,
      actorName
    });
    res.status(500).json({ error: "Failed to delete subject" });
    return;
  }

  await persistAuditLog({
    scope: "content",
    action,
    target: `${subject.boardName} / ${subject.className || "unassigned"} / ${subject.name}`,
    status: "success",
    message: `Deleted subject ${subject.slug}`,
    actorId,
    actorName
  });

  // Purge cached subject/chapter lists
  void cacheService.delete(CacheKeys.subjectList());
  void cacheService.delete(CacheKeys.subjectDetail(subject.id));
  void cacheService.invalidatePattern("learn:*");
  void cacheService.invalidatePattern("chapters:list:*");

  res.status(200).json({
    subject: {
      id: subject.id,
      name: subject.name,
      slug: subject.slug
    },
    timestamp: new Date().toISOString()
  });
});

adminRouter.post("/content/subjects/:id/update", requireSession, async (req, res) => {
  const parsedParams = curriculumEntityParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid subject identifier",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const parsedBody = curriculumSubjectUpdateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid subject payload",
      details: parsedBody.error.flatten()
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;
  const action = "Update subject";
  const fallbackTarget = `Subject #${parsedParams.data.id}`;

  const subjectRows = await db
    .select({
      id: subjects.id,
      name: subjects.name,
      slug: subjects.slug,
      icon: subjects.icon,
      description: subjects.description,
      coverImageUrl: subjects.coverImageUrl,
      boardClassId: subjects.boardClassId,
      className: boardClasses.name,
      boardName: boards.name
    })
    .from(subjects)
    .leftJoin(boardClasses, eq(subjects.boardClassId, boardClasses.id))
    .innerJoin(boards, eq(subjects.boardId, boards.id))
    .where(eq(subjects.id, parsedParams.data.id))
    .limit(1);

  const subject = subjectRows[0];
  if (!subject) {
    await persistAuditLog({
      scope: "content",
      action,
      target: fallbackTarget,
      status: "failed",
      message: "Subject not found",
      actorId,
      actorName
    });
    res.status(404).json({
      error: "Subject not found"
    });
    return;
  }

  try {
    const updatedRows = await db
      .update(subjects)
      .set({
        name: parsedBody.data.name.trim(),
        slug: parsedBody.data.slug.trim().toLowerCase(),
        ...(parsedBody.data.icon !== undefined ? { icon: parsedBody.data.icon?.trim() ?? null } : {}),
        ...(parsedBody.data.description !== undefined ? { description: parsedBody.data.description?.trim() ?? null } : {}),
        ...(parsedBody.data.coverImageUrl !== undefined ? { coverImageUrl: parsedBody.data.coverImageUrl } : {})
      })
      .where(eq(subjects.id, parsedParams.data.id))
      .returning({
        id: subjects.id,
        name: subjects.name,
        slug: subjects.slug,
        icon: subjects.icon,
        description: subjects.description,
        coverImageUrl: subjects.coverImageUrl
      });

    const updatedSubject = updatedRows[0];
    if (!updatedSubject) {
      throw new Error("Failed to update subject");
    }

    await persistAuditLog({
      scope: "content",
      action,
      target: `${subject.boardName} / ${subject.className || "unassigned"} / ${subject.name}`,
      status: "success",
      message: `Updated subject ${subject.slug}`,
      actorId,
      actorName
    });

    // Purge cached subject/chapter lists
    void cacheService.delete(CacheKeys.subjectList());
    void cacheService.delete(CacheKeys.subjectDetail(subject.id));
    void cacheService.invalidatePattern("learn:*");
    void cacheService.invalidatePattern("chapters:list:*");

    res.status(200).json({
      subject: updatedSubject,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // Check if this is a unique constraint violation on slug
    const isSlugConflict = error instanceof Error &&
      (error.message.includes("unique constraint") || error.message.includes("duplicate key")) &&
      error.message.toLowerCase().includes("slug");

    // Also check for PostgreSQL error code 23505 (unique_violation)
    const isUniqueViolation = typeof error === 'object' && error !== null &&
      ('code' in error && error.code === '23505');

    await persistAuditLog({
      scope: "content",
      action,
      target: `${subject.boardName} / ${subject.className || "unassigned"} / ${subject.name}`,
      status: "failed",
      message: error instanceof Error ? error.message : "Subject update failed",
      actorId,
      actorName
    });

    if (isSlugConflict || (isUniqueViolation && error instanceof Error && error.message.toLowerCase().includes("slug"))) {
      res.status(409).json({ error: "Subject slug already in use" });
    } else {
      res.status(500).json({ error: "Failed to update subject" });
    }
  }
});

adminRouter.post("/content/chapters/:id/update", requireSession, async (req, res) => {
  const parsedParams = curriculumEntityParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid chapter identifier",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const parsedBody = curriculumChapterUpdateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid chapter payload",
      details: parsedBody.error.flatten()
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;
  const action = "Update chapter";
  const fallbackTarget = `Chapter #${parsedParams.data.id}`;

  const chapterRows = await db
    .select({
      id: chapters.id,
      subjectId: chapters.subjectId,
      chapterNumber: chapters.chapterNumber,
      title: chapters.title,
      slug: chapters.slug,
      isPublished: chapters.isPublished,
      subjectName: subjects.name
    })
    .from(chapters)
    .innerJoin(subjects, eq(chapters.subjectId, subjects.id))
    .where(eq(chapters.id, parsedParams.data.id))
    .limit(1);
  const chapter = chapterRows[0];
  if (!chapter) {
    await persistAuditLog({
      scope: "content",
      action,
      target: fallbackTarget,
      status: "failed",
      message: "Chapter not found",
      actorId,
      actorName
    });
    res.status(404).json({
      error: "Chapter not found"
    });
    return;
  }

  try {
    const updatedRows = await db
      .update(chapters)
      .set({
        chapterNumber: parsedBody.data.chapterNumber,
        title: parsedBody.data.title.trim(),
        slug: parsedBody.data.slug.trim().toLowerCase(),
        ...(parsedBody.data.coverImageUrl !== undefined ? { coverImageUrl: parsedBody.data.coverImageUrl ?? null } : {})
      })
      .where(eq(chapters.id, chapter.id))
      .returning({
        id: chapters.id,
        subjectId: chapters.subjectId,
        chapterNumber: chapters.chapterNumber,
        title: chapters.title,
        slug: chapters.slug,
        isPublished: chapters.isPublished
      });
    const updatedChapter = updatedRows[0];
    if (!updatedChapter) {
      await persistAuditLog({
        scope: "content",
        action,
        target: `${chapter.subjectName} / ${chapter.title}`,
        status: "failed",
        message: "Chapter not found",
        actorId,
        actorName
      });
      res.status(404).json({
        error: "Chapter not found"
      });
      return;
    }

    await ensureChapterTitleAlias({
      chapterId: chapter.id,
      aliasTitle: chapter.title
    });
    await ensureChapterTitleAlias({
      chapterId: chapter.id,
      aliasTitle: updatedChapter.title
    });
    await refreshLinksForChapterAliases({
      chapterId: chapter.id
    });

    await persistAuditLog({
      scope: "content",
      action,
      target: `${chapter.subjectName} / ${chapter.title}`,
      status: "success",
      message: `Updated chapter to ${updatedChapter.slug}`,
      actorId,
      actorName
    });

    // Purge cached chapter data
    void cacheService.delete(CacheKeys.chapterList(chapter.subjectId));
    void cacheService.delete(CacheKeys.chapterContent(chapter.id));

    res.status(200).json({
      chapter: updatedChapter,
      timestamp: new Date().toISOString()
    });
  } catch {
    await persistAuditLog({
      scope: "content",
      action,
      target: `${chapter.subjectName} / ${chapter.title}`,
      status: "failed",
      message: "Chapter update failed",
      actorId,
      actorName
    });
    res.status(409).json({
      error: "Chapter already exists for subject"
    });
  }
});

adminRouter.post("/content/chapters/:id/delete", requireSession, async (req, res) => {
  const parsedParams = curriculumEntityParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid chapter identifier",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;
  const action = "Delete chapter";
  const fallbackTarget = `Chapter #${parsedParams.data.id}`;

  const chapterRows = await db
    .select({
      id: chapters.id,
      subjectId: chapters.subjectId,
      chapterNumber: chapters.chapterNumber,
      title: chapters.title,
      slug: chapters.slug,
      isPublished: chapters.isPublished,
      subjectName: subjects.name
    })
    .from(chapters)
    .innerJoin(subjects, eq(chapters.subjectId, subjects.id))
    .where(eq(chapters.id, parsedParams.data.id))
    .limit(1);
  const chapter = chapterRows[0];
  if (!chapter) {
    await persistAuditLog({
      scope: "content",
      action,
      target: fallbackTarget,
      status: "failed",
      message: "Chapter not found",
      actorId,
      actorName
    });
    res.status(404).json({
      error: "Chapter not found"
    });
    return;
  }

  await db.delete(chapters).where(eq(chapters.id, chapter.id));

  await persistAuditLog({
    scope: "content",
    action,
    target: `${chapter.subjectName} / ${chapter.title}`,
    status: "success",
    message: `Deleted chapter ${chapter.slug}`,
    actorId,
    actorName
  });

  // Purge cached chapter data
  void cacheService.delete(CacheKeys.chapterList(chapter.subjectId));
  void cacheService.delete(CacheKeys.chapterContent(chapter.id));

  res.status(200).json({
    chapter: {
      id: chapter.id,
      subjectId: chapter.subjectId,
      chapterNumber: chapter.chapterNumber,
      title: chapter.title,
      slug: chapter.slug,
      isPublished: chapter.isPublished
    },
    timestamp: new Date().toISOString()
  });
});

adminRouter.post("/content/exercises/:id/update", requireSession, async (req, res) => {
  const parsedParams = curriculumEntityParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid exercise identifier",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const parsedBody = curriculumExerciseUpdateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid exercise payload",
      details: parsedBody.error.flatten()
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;
  const action = "Update exercise";
  const fallbackTarget = `Exercise #${parsedParams.data.id}`;

  const exerciseRows = await db
    .select({
      id: exercises.id,
      chapterId: exercises.chapterId,
      exerciseNumber: exercises.exerciseNumber,
      question: exercises.question,
      solution: exercises.solution,
      difficulty: exercises.difficulty,
      type: exercises.type,
      problemMarkdown: exercises.problemMarkdown,
      solutionCode: exercises.solutionCode,
      visualizationHtml: exercises.visualizationHtml,
      blanksAnswer: exercises.blanksAnswer,
      statements: exercises.statements,
      chapterTitle: chapters.title,
      subjectName: subjects.name
    })
    .from(exercises)
    .innerJoin(chapters, eq(exercises.chapterId, chapters.id))
    .innerJoin(subjects, eq(chapters.subjectId, subjects.id))
    .where(eq(exercises.id, parsedParams.data.id))
    .limit(1);
  const exercise = exerciseRows[0];
  if (!exercise) {
    await persistAuditLog({
      scope: "content",
      action,
      target: fallbackTarget,
      status: "failed",
      message: "Exercise not found",
      actorId,
      actorName
    });
    res.status(404).json({
      error: "Exercise not found"
    });
    return;
  }

  const isPhysicsChapter = exercise.subjectName.toLowerCase().includes("physics");
  if (parsedBody.data.type === "numerical" && !isPhysicsChapter) {
    await persistAuditLog({
      scope: "content",
      action,
      target: `${exercise.subjectName} / ${exercise.chapterTitle} / ${exercise.exerciseNumber}`,
      status: "failed",
      message: "Numerical exercises are only allowed for Physics chapters",
      actorId,
      actorName
    });
    res.status(400).json({
      error: "Numerical problems are only allowed for Physics chapters"
    });
    return;
  }

  try {
    // Determine if we need to clear type-specific fields
    // If changing FROM 'numerical' to another type, clear numerical fields
    // If changing FROM 'fill_in_blanks' to another type, clear blanks fields
    const isChangingFromNumerical =
      exercise.type === "numerical" && parsedBody.data.type !== "numerical";
    const isChangingFromBlanks =
      exercise.type === "fill_in_blanks" && parsedBody.data.type !== "fill_in_blanks";

    const updatedRows = await db
      .update(exercises)
      .set({
        exerciseNumber: parsedBody.data.exerciseNumber.trim(),
        question: parsedBody.data.question?.trim() || exercise.question,
        solution: parsedBody.data.solution?.trim() || exercise.solution,
        difficulty: parsedBody.data.difficulty,
        type: parsedBody.data.type,
        // Clear if changing away from numerical, otherwise set to new values
        problemMarkdown: isChangingFromNumerical
          ? null
          : (parsedBody.data.problemMarkdown?.trim() || null),
        solutionCode: isChangingFromNumerical
          ? null
          : (parsedBody.data.solutionCode?.trim() || null),
        visualizationHtml: isChangingFromNumerical
          ? null
          : parsedBody.data.type === "numerical"
            ? (parsedBody.data.visualizationHtml?.trim() || null)
            : null,
        blanksAnswer: isChangingFromBlanks
          ? null
          : parsedBody.data.type === "fill_in_blanks"
            ? (parsedBody.data.blanksAnswer ?? null)
            : null,
        statements: isChangingFromBlanks
          ? null
          : parsedBody.data.type === "fill_in_blanks"
            ? (parsedBody.data.statements ?? null)
            : null
      })
      .where(eq(exercises.id, exercise.id))
      .returning({
        id: exercises.id,
        chapterId: exercises.chapterId,
        exerciseNumber: exercises.exerciseNumber,
        question: exercises.question,
        solution: exercises.solution,
        difficulty: exercises.difficulty,
        type: exercises.type,
        problemMarkdown: exercises.problemMarkdown,
        solutionCode: exercises.solutionCode,
        visualizationHtml: exercises.visualizationHtml,
        blanksAnswer: exercises.blanksAnswer,
        statements: exercises.statements
      });
    const updatedExercise = updatedRows[0];
    if (!updatedExercise) {
      await persistAuditLog({
        scope: "content",
        action,
        target: `${exercise.subjectName} / ${exercise.chapterTitle} / ${exercise.exerciseNumber}`,
        status: "failed",
        message: "Exercise not found",
        actorId,
        actorName
      });
      res.status(404).json({
        error: "Exercise not found"
      });
      return;
    }

    // Invalidate chapter content cache (exercises are part of chapter content)
    await cacheService.delete(CacheKeys.chapterContent(exercise.chapterId));

    await persistAuditLog({
      scope: "content",
      action,
      target: `${exercise.subjectName} / ${exercise.chapterTitle} / ${exercise.exerciseNumber}`,
      status: "success",
      message: `Updated exercise to ${updatedExercise.exerciseNumber}`,
      actorId,
      actorName
    });
    res.status(200).json({
      exercise: updatedExercise,
      timestamp: new Date().toISOString()
    });
  } catch {
    await persistAuditLog({
      scope: "content",
      action,
      target: `${exercise.subjectName} / ${exercise.chapterTitle} / ${exercise.exerciseNumber}`,
      status: "failed",
      message: "Exercise update failed",
      actorId,
      actorName
    });
    res.status(409).json({
      error: "Exercise already exists for chapter"
    });
  }
});

adminRouter.post("/content/exercises/:id/delete", requireSession, async (req, res) => {
  const parsedParams = curriculumEntityParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid exercise identifier",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;
  const action = "Delete exercise";
  const fallbackTarget = `Exercise #${parsedParams.data.id}`;

  const exerciseRows = await db
    .select({
      id: exercises.id,
      chapterId: exercises.chapterId,
      exerciseNumber: exercises.exerciseNumber,
      question: exercises.question,
      solution: exercises.solution,
      difficulty: exercises.difficulty,
      type: exercises.type,
      chapterTitle: chapters.title,
      subjectName: subjects.name
    })
    .from(exercises)
    .innerJoin(chapters, eq(exercises.chapterId, chapters.id))
    .innerJoin(subjects, eq(chapters.subjectId, subjects.id))
    .where(eq(exercises.id, parsedParams.data.id))
    .limit(1);
  const exercise = exerciseRows[0];
  if (!exercise) {
    await persistAuditLog({
      scope: "content",
      action,
      target: fallbackTarget,
      status: "failed",
      message: "Exercise not found",
      actorId,
      actorName
    });
    res.status(404).json({
      error: "Exercise not found"
    });
    return;
  }

  await db.delete(exercises).where(eq(exercises.id, exercise.id));

  // Invalidate chapter content cache (exercises are part of chapter content)
  await cacheService.delete(CacheKeys.chapterContent(exercise.chapterId));

  await persistAuditLog({
    scope: "content",
    action,
    target: `${exercise.subjectName} / ${exercise.chapterTitle} / ${exercise.exerciseNumber}`,
    status: "success",
    message: `Deleted exercise ${exercise.exerciseNumber}`,
    actorId,
    actorName
  });

  res.status(200).json({
    exercise: {
      id: exercise.id,
      chapterId: exercise.chapterId,
      exerciseNumber: exercise.exerciseNumber,
      question: exercise.question,
      solution: exercise.solution,
      difficulty: exercise.difficulty,
      type: exercise.type
    },
    timestamp: new Date().toISOString()
  });
});

// ==================== QUIZ CRUD ====================

/**
 * POST /api/admin/content/quizzes - Upsert quiz (create or update)
 * Creates a new quiz if one doesn't exist for the chapter, otherwise updates the existing one.
 * Enforces ONE quiz per chapter via upsert pattern.
 */
adminRouter.post("/content/quizzes", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedBody = quizUpsertBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid quiz payload",
      details: parsedBody.error.flatten()
    });
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;

  // Check if quiz exists for this chapterId
  const existingQuizRows = await db
    .select({
      id: quizzes.id,
      chapterId: quizzes.chapterId,
      title: quizzes.title,
      durationMinutes: quizzes.durationMinutes,
      totalMarks: quizzes.totalMarks,
      type: quizzes.type
    })
    .from(quizzes)
    .where(eq(quizzes.chapterId, parsedBody.data.chapterId))
    .limit(1);

  const existingQuiz = existingQuizRows[0];

  if (existingQuiz) {
    // UPDATE existing quiz
    const updatedRows = await db
      .update(quizzes)
      .set({
        title: parsedBody.data.title.trim(),
        durationMinutes: parsedBody.data.durationMinutes ?? existingQuiz.durationMinutes,
        type: parsedBody.data.type
      })
      .where(eq(quizzes.id, existingQuiz.id))
      .returning({
        id: quizzes.id,
        chapterId: quizzes.chapterId,
        title: quizzes.title,
        durationMinutes: quizzes.durationMinutes,
        totalMarks: quizzes.totalMarks,
        type: quizzes.type
      });

    const updatedQuiz = updatedRows[0];
    if (!updatedQuiz) {
      await persistAuditLog({
        scope: "content",
        action: "Upsert quiz",
        target: `Chapter #${parsedBody.data.chapterId}`,
        status: "failed",
        message: "Quiz update failed",
        actorId,
        actorName
      });
      res.status(500).json({ error: "Failed to update quiz" });
      return;
    }

    // Invalidate chapter content cache (quiz metadata is part of chapter content)
    await cacheService.delete(CacheKeys.chapterContent(updatedQuiz.chapterId));

    await persistAuditLog({
      scope: "content",
      action: "Update quiz",
      target: `Quiz #${updatedQuiz.id} - ${updatedQuiz.title}`,
      status: "success",
      message: "Updated existing quiz via upsert",
      actorId,
      actorName
    });

    res.status(200).json({
      data: updatedQuiz,
      created: false
    });
  } else {
    // CREATE new quiz
    const insertedRows = await db
      .insert(quizzes)
      .values({
        chapterId: parsedBody.data.chapterId,
        title: parsedBody.data.title.trim(),
        durationMinutes: parsedBody.data.durationMinutes ?? 30,
        totalMarks: 0, // Initial totalMarks is 0, will be updated when questions are added
        type: parsedBody.data.type ?? "chapter_quiz"
      })
      .returning({
        id: quizzes.id,
        chapterId: quizzes.chapterId,
        title: quizzes.title,
        durationMinutes: quizzes.durationMinutes,
        totalMarks: quizzes.totalMarks,
        type: quizzes.type
      });

    const newQuiz = insertedRows[0];
    if (!newQuiz) {
      await persistAuditLog({
        scope: "content",
        action: "Upsert quiz",
        target: `Chapter #${parsedBody.data.chapterId}`,
        status: "failed",
        message: "Quiz creation failed",
        actorId,
        actorName
      });
      res.status(500).json({ error: "Failed to create quiz" });
      return;
    }

    // Invalidate chapter content cache (quiz metadata is part of chapter content)
    await cacheService.delete(CacheKeys.chapterContent(newQuiz.chapterId));

    await persistAuditLog({
      scope: "content",
      action: "Create quiz",
      target: `Quiz #${newQuiz.id} - ${newQuiz.title}`,
      status: "success",
      message: "Created new quiz via upsert",
      actorId,
      actorName
    });

    res.status(201).json({
      data: newQuiz,
      created: true
    });
  }
});

/**
 * GET /api/admin/content/quizzes?chapterId=N - Get quiz by chapter
 */
adminRouter.get("/content/quizzes", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedQuery = quizQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({
      error: "Invalid quiz query",
      details: parsedQuery.error.flatten()
    });
    return;
  }

  if (!parsedQuery.data.chapterId) {
    res.status(400).json({
      error: "chapterId is required"
    });
    return;
  }

  const quizRows = await db
    .select({
      id: quizzes.id,
      chapterId: quizzes.chapterId,
      title: quizzes.title,
      durationMinutes: quizzes.durationMinutes,
      totalMarks: quizzes.totalMarks,
      type: quizzes.type
    })
    .from(quizzes)
    .where(eq(quizzes.chapterId, parsedQuery.data.chapterId))
    .limit(1);

  const quiz = quizRows[0] ?? null;

  res.status(200).json({
    data: quiz
  });
});

/**
 * POST /api/admin/content/quizzes/:id/update - Update quiz metadata
 */
adminRouter.post("/content/quizzes/:id/update", requireSession, async (req, res) => {
  const parsedParams = quizParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid quiz identifier",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const parsedBody = quizUpdateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid quiz payload",
      details: parsedBody.error.flatten()
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;
  const action = "Update quiz";
  const fallbackTarget = `Quiz #${parsedParams.data.id}`;

  const quizRows = await db
    .select({
      id: quizzes.id,
      chapterId: quizzes.chapterId,
      title: quizzes.title,
      durationMinutes: quizzes.durationMinutes,
      totalMarks: quizzes.totalMarks,
      type: quizzes.type
    })
    .from(quizzes)
    .where(eq(quizzes.id, parsedParams.data.id))
    .limit(1);

  const quiz = quizRows[0];
  if (!quiz) {
    await persistAuditLog({
      scope: "content",
      action,
      target: fallbackTarget,
      status: "failed",
      message: "Quiz not found",
      actorId,
      actorName
    });
    res.status(404).json({ error: "Quiz not found" });
    return;
  }

  const updatedRows = await db
    .update(quizzes)
    .set({
      title: parsedBody.data.title.trim(),
      ...(parsedBody.data.durationMinutes !== undefined && { durationMinutes: parsedBody.data.durationMinutes }),
      ...(parsedBody.data.type !== undefined && { type: parsedBody.data.type })
    })
    .where(eq(quizzes.id, quiz.id))
    .returning({
      id: quizzes.id,
      chapterId: quizzes.chapterId,
      title: quizzes.title,
      durationMinutes: quizzes.durationMinutes,
      totalMarks: quizzes.totalMarks,
      type: quizzes.type
    });

  const updatedQuiz = updatedRows[0];
  if (!updatedQuiz) {
    await persistAuditLog({
      scope: "content",
      action,
      target: `Quiz #${quiz.id}`,
      status: "failed",
      message: "Quiz not found",
      actorId,
      actorName
    });
    res.status(404).json({ error: "Quiz not found" });
    return;
  }

  // Invalidate chapter content cache (quiz metadata is part of chapter content)
  await cacheService.delete(CacheKeys.chapterContent(updatedQuiz.chapterId));

  await persistAuditLog({
    scope: "content",
    action,
    target: `Quiz #${updatedQuiz.id} - ${updatedQuiz.title}`,
    status: "success",
    message: "Updated quiz metadata",
    actorId,
    actorName
  });

  res.status(200).json({
    data: updatedQuiz
  });
});

/**
 * POST /api/admin/content/quizzes/:id/delete - Delete quiz (cascade via FK)
 */
adminRouter.post("/content/quizzes/:id/delete", requireSession, async (req, res) => {
  const parsedParams = quizParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid quiz identifier",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;
  const action = "Delete quiz";
  const fallbackTarget = `Quiz #${parsedParams.data.id}`;

  const quizRows = await db
    .select({
      id: quizzes.id,
      chapterId: quizzes.chapterId,
      title: quizzes.title,
      durationMinutes: quizzes.durationMinutes,
      totalMarks: quizzes.totalMarks,
      type: quizzes.type
    })
    .from(quizzes)
    .where(eq(quizzes.id, parsedParams.data.id))
    .limit(1);

  const quiz = quizRows[0];
  if (!quiz) {
    await persistAuditLog({
      scope: "content",
      action,
      target: fallbackTarget,
      status: "failed",
      message: "Quiz not found",
      actorId,
      actorName
    });
    res.status(404).json({ error: "Quiz not found" });
    return;
  }

  await db.delete(quizzes).where(eq(quizzes.id, quiz.id));

  // Invalidate chapter content cache + quiz questions cache
  await cacheService.delete(CacheKeys.chapterContent(quiz.chapterId));
  await cacheService.delete(CacheKeys.quizQuestions(quiz.id));

  await persistAuditLog({
    scope: "content",
    action,
    target: `Quiz #${quiz.id} - ${quiz.title}`,
    status: "success",
    message: "Deleted quiz (questions cascade via FK)",
    actorId,
    actorName
  });

  res.status(200).json({
    success: true,
    deletedId: quiz.id
  });
});

// ==================== FLASHCARD CRUD ====================

/**
 * POST /api/admin/content/flashcards - Create flashcard
 * If orderIndex not provided, appends to end of chapter's flashcards
 */
adminRouter.post("/content/flashcards", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedBody = flashcardCreateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid flashcard payload",
      details: parsedBody.error.flatten()
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
        maxOrder: sql<number>`coalesce(max(${flashcards.orderIndex}), -1)::int`
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
      orderIndex
    })
    .returning({
      id: flashcards.id,
      chapterId: flashcards.chapterId,
      front: flashcards.front,
      back: flashcards.back,
      orderIndex: flashcards.orderIndex
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
      actorName
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
    actorName
  });

  res.status(201).json({
    data: newFlashcard
  });
});

/**
 * GET /api/admin/content/flashcards?chapterId=N - List flashcards for chapter
 * Ordered by orderIndex ASC
 */
adminRouter.get("/content/flashcards", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedQuery = flashcardListQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({
      error: "Invalid flashcard query",
      details: parsedQuery.error.flatten()
    });
    return;
  }

  if (!parsedQuery.data.chapterId) {
    res.status(400).json({
      error: "chapterId is required"
    });
    return;
  }

  const flashcardRows = await db
    .select({
      id: flashcards.id,
      chapterId: flashcards.chapterId,
      front: flashcards.front,
      back: flashcards.back,
      orderIndex: flashcards.orderIndex
    })
    .from(flashcards)
    .where(eq(flashcards.chapterId, parsedQuery.data.chapterId))
    .orderBy(asc(flashcards.orderIndex));

  res.status(200).json({
    data: flashcardRows,
    total: flashcardRows.length
  });
});

/**
 * POST /api/admin/content/flashcards/:id/update - Update flashcard
 */
adminRouter.post("/content/flashcards/:id/update", requireSession, async (req, res) => {
  const parsedParams = flashcardParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid flashcard identifier",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const parsedBody = flashcardUpdateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid flashcard payload",
      details: parsedBody.error.flatten()
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
      orderIndex: flashcards.orderIndex
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
      actorName
    });
    res.status(404).json({ error: "Flashcard not found" });
    return;
  }

  const updatedRows = await db
    .update(flashcards)
    .set({
      ...(parsedBody.data.front !== undefined && { front: parsedBody.data.front.trim() }),
      ...(parsedBody.data.back !== undefined && { back: parsedBody.data.back.trim() })
    })
    .where(eq(flashcards.id, existingFlashcard.id))
    .returning({
      id: flashcards.id,
      chapterId: flashcards.chapterId,
      front: flashcards.front,
      back: flashcards.back,
      orderIndex: flashcards.orderIndex
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
      actorName
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
    actorName
  });

  res.status(200).json({
    data: updatedFlashcard
  });
});

/**
 * POST /api/admin/content/flashcards/:id/delete - Delete flashcard
 */
adminRouter.post("/content/flashcards/:id/delete", requireSession, async (req, res) => {
  const parsedParams = flashcardParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid flashcard identifier",
      details: parsedParams.error.flatten()
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
      chapterId: flashcards.chapterId
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
      actorName
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
    actorName
  });

  res.status(200).json({
    success: true,
    deletedId: flashcard.id
  });
});

/**
 * POST /api/admin/content/flashcards/reorder - Reorder flashcards
 * Validates that orderedIds contains ALL flashcard IDs for the chapter
 * Normalizes orderIndex to 0, 1, 2, 3...
 */
adminRouter.post("/content/flashcards/reorder", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedBody = flashcardReorderBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid reorder payload",
      details: parsedBody.error.flatten()
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
      error: "orderedIds contains duplicate values"
    });
    return;
  }

  // Validate that orderedIds contains ALL flashcards for this chapter
  if (existingIds.size !== providedIds.size || ![...existingIds].every((id) => providedIds.has(id))) {
    res.status(400).json({
      error: "orderedIds must contain exactly all flashcard IDs for the chapter",
      details: {
        existingIds: [...existingIds],
        providedIds
      }
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
      actorName
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
    actorName
  });

  res.status(200).json({
    success: true,
    updated: updatedFlashcards
  });
});

// ==================== FORMULA LIBRARY CRUD ====================

/**
 * GET /api/admin/content/formulas - List all formulas
 * Optional query: ?subjectId=N&chapterId=N
 */
adminRouter.get("/content/formulas", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedQuery = formulaListQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({
      error: "Invalid formula query",
      details: parsedQuery.error.flatten()
    });
    return;
  }

  const conditions: SQL[] = [];
  if (parsedQuery.data.subjectId) {
    conditions.push(eq(formulas.subjectId, parsedQuery.data.subjectId));
  }
  if (parsedQuery.data.chapterId) {
    conditions.push(eq(formulas.chapterId, parsedQuery.data.chapterId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const formulaRows = await db
    .select({
      id: formulas.id,
      subjectId: formulas.subjectId,
      chapterId: formulas.chapterId,
      name: formulas.name,
      formulaLatex: formulas.formulaLatex,
      description: formulas.description,
      variables: formulas.variables,
      tags: formulas.tags,
      createdAt: formulas.createdAt,
      updatedAt: formulas.updatedAt,
      subjectName: subjects.name,
      chapterTitle: chapters.title
    })
    .from(formulas)
    .leftJoin(subjects, eq(formulas.subjectId, subjects.id))
    .leftJoin(chapters, eq(formulas.chapterId, chapters.id))
    .where(whereClause)
    .orderBy(desc(formulas.createdAt));

  res.status(200).json({
    data: formulaRows,
    total: formulaRows.length
  });
});

/**
 * POST /api/admin/content/formulas - Create a formula
 */
adminRouter.post("/content/formulas", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedBody = formulaCreateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid formula payload",
      details: parsedBody.error.flatten()
    });
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;

  const insertedRows = await db
    .insert(formulas)
    .values({
      subjectId: parsedBody.data.subjectId,
      chapterId: parsedBody.data.chapterId,
      name: parsedBody.data.name.trim(),
      formulaLatex: parsedBody.data.formulaLatex.trim(),
      description: parsedBody.data.description.trim(),
      variables: parsedBody.data.variables,
      tags: parsedBody.data.tags
    })
    .returning({
      id: formulas.id,
      subjectId: formulas.subjectId,
      chapterId: formulas.chapterId,
      name: formulas.name,
      formulaLatex: formulas.formulaLatex,
      description: formulas.description,
      variables: formulas.variables,
      tags: formulas.tags,
      createdAt: formulas.createdAt,
      updatedAt: formulas.updatedAt
    });

  const newFormula = insertedRows[0];
  if (!newFormula) {
    await persistAuditLog({
      scope: "content",
      action: "Create formula",
      target: `Subject #${parsedBody.data.subjectId}`,
      status: "failed",
      message: "Formula creation failed",
      actorId,
      actorName
    });
    res.status(500).json({ error: "Failed to create formula" });
    return;
  }

  await persistAuditLog({
    scope: "content",
    action: "Create formula",
    target: `Formula #${newFormula.id}`,
    status: "success",
    message: `Created formula "${newFormula.name}" for subject ${newFormula.subjectId}`,
    actorId,
    actorName
  });

  res.status(201).json({
    data: newFormula
  });
});

/**
 * POST /api/admin/content/formulas/:id/update - Update a formula
 */
adminRouter.post("/content/formulas/:id/update", requireSession, async (req, res) => {
  const parsedParams = curriculumEntityParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid formula identifier",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedBody = formulaUpdateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid formula payload",
      details: parsedBody.error.flatten()
    });
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;

  // Check if formula exists
  const existingRows = await db
    .select({ id: formulas.id })
    .from(formulas)
    .where(eq(formulas.id, parsedParams.data.id))
    .limit(1);

  const existing = existingRows[0];
  if (!existing) {
    await persistAuditLog({
      scope: "content",
      action: "Update formula",
      target: `Formula #${parsedParams.data.id}`,
      status: "failed",
      message: "Formula not found",
      actorId,
      actorName
    });
    res.status(404).json({ error: "Formula not found" });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsedBody.data.subjectId !== undefined) updateData.subjectId = parsedBody.data.subjectId;
  if (parsedBody.data.chapterId !== undefined) updateData.chapterId = parsedBody.data.chapterId;
  if (parsedBody.data.name !== undefined) updateData.name = parsedBody.data.name.trim();
  if (parsedBody.data.formulaLatex !== undefined) updateData.formulaLatex = parsedBody.data.formulaLatex.trim();
  if (parsedBody.data.description !== undefined) updateData.description = parsedBody.data.description.trim();
  if (parsedBody.data.variables !== undefined) updateData.variables = parsedBody.data.variables;
  if (parsedBody.data.tags !== undefined) updateData.tags = parsedBody.data.tags;
  updateData.updatedAt = new Date();

  const updatedRows = await db
    .update(formulas)
    .set(updateData)
    .where(eq(formulas.id, existing.id))
    .returning({
      id: formulas.id,
      subjectId: formulas.subjectId,
      chapterId: formulas.chapterId,
      name: formulas.name,
      formulaLatex: formulas.formulaLatex,
      description: formulas.description,
      variables: formulas.variables,
      tags: formulas.tags,
      createdAt: formulas.createdAt,
      updatedAt: formulas.updatedAt
    });

  const updatedFormula = updatedRows[0];
  if (!updatedFormula) {
    await persistAuditLog({
      scope: "content",
      action: "Update formula",
      target: `Formula #${existing.id}`,
      status: "failed",
      message: "Formula update failed",
      actorId,
      actorName
    });
    res.status(500).json({ error: "Failed to update formula" });
    return;
  }

  await persistAuditLog({
    scope: "content",
    action: "Update formula",
    target: `Formula #${updatedFormula.id}`,
    status: "success",
    message: `Updated formula "${updatedFormula.name}"`,
    actorId,
    actorName
  });

  res.status(200).json({
    data: updatedFormula
  });
});

/**
 * POST /api/admin/content/formulas/:id/delete - Delete a formula
 */
adminRouter.post("/content/formulas/:id/delete", requireSession, async (req, res) => {
  const parsedParams = curriculumEntityParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid formula identifier",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;

  const formulaRows = await db
    .select({
      id: formulas.id,
      name: formulas.name,
      subjectId: formulas.subjectId
    })
    .from(formulas)
    .where(eq(formulas.id, parsedParams.data.id))
    .limit(1);

  const formula = formulaRows[0];
  if (!formula) {
    await persistAuditLog({
      scope: "content",
      action: "Delete formula",
      target: `Formula #${parsedParams.data.id}`,
      status: "failed",
      message: "Formula not found",
      actorId,
      actorName
    });
    res.status(404).json({ error: "Formula not found" });
    return;
  }

  await db.delete(formulas).where(eq(formulas.id, formula.id));

  await persistAuditLog({
    scope: "content",
    action: "Delete formula",
    target: `Formula #${formula.id} "${formula.name}"`,
    status: "success",
    message: `Deleted formula from subject ${formula.subjectId}`,
    actorId,
    actorName
  });

  res.status(200).json({
    success: true,
    deletedId: formula.id
  });
});

// ==================== QUIZ QUESTIONS CRUD ====================

/**
 * Helper to recalculate and update quiz totalMarks based on its questions
 */
const recalculateQuizTotalMarks = async (quizId: number): Promise<number> => {
  const questionMarksResult = await db
    .select({
      total: sql<number>`coalesce(sum(${quizQuestions.marks}), 0)::int`
    })
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quizId));

  const totalMarks = questionMarksResult[0]?.total ?? 0;

  await db
    .update(quizzes)
    .set({ totalMarks })
    .where(eq(quizzes.id, quizId));

  return totalMarks;
};

/**
 * POST /api/admin/content/quiz-questions - Add question to quiz
 */
adminRouter.post("/content/quiz-questions", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedBody = quizQuestionCreateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    console.error("[quiz-questions POST] Validation failed:", {
      body: req.body,
      errors: parsedBody.error.flatten()
    });
    res.status(400).json({
      error: "Invalid quiz question payload",
      details: parsedBody.error.flatten()
    });
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;

  // Verify quiz exists
  const quizRows = await db
    .select({
      id: quizzes.id,
      title: quizzes.title,
      chapterId: quizzes.chapterId
    })
    .from(quizzes)
    .where(eq(quizzes.id, parsedBody.data.quizId))
    .limit(1);

  const quiz = quizRows[0];
  if (!quiz) {
    await persistAuditLog({
      scope: "content",
      action: "Add quiz question",
      target: `Quiz #${parsedBody.data.quizId}`,
      status: "failed",
      message: "Quiz not found",
      actorId,
      actorName
    });
    res.status(404).json({ error: "Quiz not found" });
    return;
  }

  const insertedRows = await db
    .insert(quizQuestions)
    .values({
      quizId: parsedBody.data.quizId,
      chapterId: parsedBody.data.chapterId ?? quiz.chapterId,
      question: parsedBody.data.question.trim(),
      optionA: parsedBody.data.optionA.trim(),
      optionB: parsedBody.data.optionB.trim(),
      optionC: parsedBody.data.optionC.trim(),
      optionD: parsedBody.data.optionD.trim(),
      correctOption: parsedBody.data.correctOption,
      explanation: parsedBody.data.explanation?.trim() ?? null,
      marks: parsedBody.data.marks ?? 1
    })
    .returning({
      id: quizQuestions.id,
      quizId: quizQuestions.quizId,
      chapterId: quizQuestions.chapterId,
      question: quizQuestions.question,
      optionA: quizQuestions.optionA,
      optionB: quizQuestions.optionB,
      optionC: quizQuestions.optionC,
      optionD: quizQuestions.optionD,
      correctOption: quizQuestions.correctOption,
      explanation: quizQuestions.explanation,
      marks: quizQuestions.marks
    });

  const newQuestion = insertedRows[0];
  if (!newQuestion) {
    await persistAuditLog({
      scope: "content",
      action: "Add quiz question",
      target: `Quiz #${quiz.id}`,
      status: "failed",
      message: "Failed to add quiz question",
      actorId,
      actorName
    });
    res.status(500).json({ error: "Failed to add quiz question" });
    return;
  }

  // Recalculate quiz totalMarks
  const newTotalMarks = await recalculateQuizTotalMarks(quiz.id);

  // Invalidate quiz questions cache + chapter content cache
  await cacheService.delete(CacheKeys.quizQuestions(quiz.id));
  await cacheService.delete(CacheKeys.chapterContent(quiz.chapterId));

  await persistAuditLog({
    scope: "content",
    action: "Add quiz question",
    target: `Quiz #${quiz.id} - ${quiz.title}`,
    status: "success",
    message: `Added question to quiz (new total marks: ${newTotalMarks})`,
    actorId,
    actorName
  });

  res.status(201).json({
    data: newQuestion
  });
});

/**
 * GET /api/admin/content/quiz-questions?quizId=N - List questions for a quiz
 */
adminRouter.get("/content/quiz-questions", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedQuery = quizQuestionListQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({
      error: "Invalid quiz question query",
      details: parsedQuery.error.flatten()
    });
    return;
  }

  const questionRows = await db
    .select({
      id: quizQuestions.id,
      quizId: quizQuestions.quizId,
      chapterId: quizQuestions.chapterId,
      question: quizQuestions.question,
      optionA: quizQuestions.optionA,
      optionB: quizQuestions.optionB,
      optionC: quizQuestions.optionC,
      optionD: quizQuestions.optionD,
      correctOption: quizQuestions.correctOption,
      explanation: quizQuestions.explanation,
      marks: quizQuestions.marks
    })
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, parsedQuery.data.quizId))
    .orderBy(asc(quizQuestions.id));

  res.status(200).json({
    data: questionRows
  });
});

/**
 * POST /api/admin/content/quiz-questions/:id/update - Update question
 */
adminRouter.post("/content/quiz-questions/:id/update", requireSession, async (req, res) => {
  const parsedParams = quizQuestionParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid quiz question identifier",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const parsedBody = quizQuestionUpdateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid quiz question payload",
      details: parsedBody.error.flatten()
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;
  const action = "Update quiz question";
  const fallbackTarget = `Quiz Question #${parsedParams.data.id}`;

  const questionRows = await db
    .select({
      id: quizQuestions.id,
      quizId: quizQuestions.quizId,
      question: quizQuestions.question
    })
    .from(quizQuestions)
    .where(eq(quizQuestions.id, parsedParams.data.id))
    .limit(1);

  const question = questionRows[0];
  if (!question) {
    await persistAuditLog({
      scope: "content",
      action,
      target: fallbackTarget,
      status: "failed",
      message: "Quiz question not found",
      actorId,
      actorName
    });
    res.status(404).json({ error: "Quiz question not found" });
    return;
  }

  const updatedRows = await db
    .update(quizQuestions)
    .set({
      question: parsedBody.data.question.trim(),
      optionA: parsedBody.data.optionA.trim(),
      optionB: parsedBody.data.optionB.trim(),
      optionC: parsedBody.data.optionC.trim(),
      optionD: parsedBody.data.optionD.trim(),
      correctOption: parsedBody.data.correctOption,
      explanation: parsedBody.data.explanation?.trim() ?? null,
      marks: parsedBody.data.marks ?? 1
    })
    .where(eq(quizQuestions.id, question.id))
    .returning({
      id: quizQuestions.id,
      quizId: quizQuestions.quizId,
      chapterId: quizQuestions.chapterId,
      question: quizQuestions.question,
      optionA: quizQuestions.optionA,
      optionB: quizQuestions.optionB,
      optionC: quizQuestions.optionC,
      optionD: quizQuestions.optionD,
      correctOption: quizQuestions.correctOption,
      explanation: quizQuestions.explanation,
      marks: quizQuestions.marks
    });

  const updatedQuestion = updatedRows[0];
  if (!updatedQuestion) {
    await persistAuditLog({
      scope: "content",
      action,
      target: fallbackTarget,
      status: "failed",
      message: "Quiz question not found",
      actorId,
      actorName
    });
    res.status(404).json({ error: "Quiz question not found" });
    return;
  }

  // Recalculate quiz totalMarks
  await recalculateQuizTotalMarks(question.quizId);

  // Invalidate quiz questions cache
  await cacheService.delete(CacheKeys.quizQuestions(question.quizId));

  await persistAuditLog({
    scope: "content",
    action,
    target: `Quiz Question #${updatedQuestion.id}`,
    status: "success",
    message: "Updated quiz question",
    actorId,
    actorName
  });

  res.status(200).json({
    data: updatedQuestion
  });
});

/**
 * POST /api/admin/content/quiz-questions/:id/delete - Delete question
 */
adminRouter.post("/content/quiz-questions/:id/delete", requireSession, async (req, res) => {
  const parsedParams = quizQuestionParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid quiz question identifier",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;
  const action = "Delete quiz question";
  const fallbackTarget = `Quiz Question #${parsedParams.data.id}`;

  const questionRows = await db
    .select({
      id: quizQuestions.id,
      quizId: quizQuestions.quizId,
      question: quizQuestions.question
    })
    .from(quizQuestions)
    .where(eq(quizQuestions.id, parsedParams.data.id))
    .limit(1);

  const question = questionRows[0];
  if (!question) {
    await persistAuditLog({
      scope: "content",
      action,
      target: fallbackTarget,
      status: "failed",
      message: "Quiz question not found",
      actorId,
      actorName
    });
    res.status(404).json({ error: "Quiz question not found" });
    return;
  }

  await db.delete(quizQuestions).where(eq(quizQuestions.id, question.id));

  // Recalculate quiz totalMarks after deletion
  await recalculateQuizTotalMarks(question.quizId);

  // Invalidate quiz questions cache
  await cacheService.delete(CacheKeys.quizQuestions(question.quizId));

  await persistAuditLog({
    scope: "content",
    action,
    target: `Quiz Question #${question.id}`,
    status: "success",
    message: "Deleted quiz question",
    actorId,
    actorName
  });

  res.status(200).json({
    success: true,
    deletedId: question.id
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
      className: sql<string>`coalesce(${boardClasses.name}, concat(${subjects.grade}::text, 'th'), 'Unknown')`,
      boardName: boards.name,
      isPublished: chapters.isPublished
    })
    .from(chapters)
    .innerJoin(subjects, eq(chapters.subjectId, subjects.id))
    .innerJoin(boards, eq(subjects.boardId, boards.id))
    .leftJoin(boardClasses, eq(subjects.boardClassId, boardClasses.id))
    .orderBy(asc(subjects.name), asc(chapters.chapterNumber));

  res.status(200).json({
    chapters: chapterRows
  });
});

adminRouter.get("/content/chapters/graph", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedQuery = chapterGraphQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({
      error: "Invalid chapter graph query",
      details: parsedQuery.error.flatten()
    });
    return;
  }

  const graph = await listAdminChapterGraph({
    query: parsedQuery.data.q
  });

  res.status(200).json({
    graph: {
      nodes: graph.nodes,
      edges: graph.edges,
      unresolvedEdgeCount: graph.unresolvedEdgeCount
    }
  });
});

adminRouter.get("/content/chapters/link-suggestions", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedQuery = chapterLinkSuggestionQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({
      error: "Invalid chapter link suggestion query",
      details: parsedQuery.error.flatten()
    });
    return;
  }

  const searchTerm = parsedQuery.data.q.trim();
  const suggestions = await db
    .select({
      id: chapters.id,
      title: chapters.title,
      slug: chapters.slug,
      chapterNumber: chapters.chapterNumber
    })
    .from(chapters)
    .where(searchTerm.length > 0 ? ilike(chapters.title, `%${escapeLikePattern(searchTerm)}%`) : undefined)
    .orderBy(asc(chapters.title), asc(chapters.chapterNumber))
    .limit(parsedQuery.data.limit);

  res.status(200).json({
    suggestions
  });
});

adminRouter.get("/content/chapters/:id/links", requireSession, async (req, res) => {
  const parsedParams = chapterParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid chapter identifier",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const chapterRows = await db
    .select({
      id: chapters.id
    })
    .from(chapters)
    .where(eq(chapters.id, parsedParams.data.id))
    .limit(1);
  if (!chapterRows[0]) {
    res.status(404).json({
      error: "Chapter not found"
    });
    return;
  }

  const sourceSubparts = alias(chapterSubparts, "source_subparts_for_links");
  const targetSubparts = alias(chapterSubparts, "target_subparts_for_links");
  const sourceChapters = alias(chapters, "source_chapters_for_links");
  const targetChapters = alias(chapters, "target_chapters_for_links");

  const outgoingRowsRaw = await db
    .select({
      sourceChapterId: sourceSubparts.chapterId,
      targetChapterId: targetSubparts.chapterId,
      targetTitle: chapterSummaryLinks.targetTitle,
      normalizedTarget: chapterSummaryLinks.normalizedTarget,
      isResolved: chapterSummaryLinks.isResolved,
      targetChapterTitle: targetChapters.title
    })
    .from(chapterSummaryLinks)
    .innerJoin(sourceSubparts, eq(chapterSummaryLinks.sourceSubpartId, sourceSubparts.id))
    .leftJoin(targetSubparts, eq(chapterSummaryLinks.targetSubpartId, targetSubparts.id))
    .leftJoin(targetChapters, eq(targetSubparts.chapterId, targetChapters.id))
    .where(eq(sourceSubparts.chapterId, parsedParams.data.id))
    .orderBy(asc(chapterSummaryLinks.targetTitle));

  const outgoingRows: Array<{
    sourceChapterId: number;
    targetChapterId: number | null;
    targetTitle: string;
    normalizedTarget: string;
    isResolved: boolean;
    targetChapterTitle: string | null;
  }> = [];
  const seenOutgoing = new Set<string>();
  for (const row of outgoingRowsRaw) {
    const key = `${row.sourceChapterId}-${row.targetChapterId ?? "unresolved"}-${row.normalizedTarget}`;
    if (seenOutgoing.has(key)) {
      continue;
    }
    seenOutgoing.add(key);
    outgoingRows.push(row);
  }

  const backlinkRowsRaw = await db
    .select({
      sourceChapterId: sourceSubparts.chapterId,
      sourceChapterTitle: sourceChapters.title,
      normalizedTarget: chapterSummaryLinks.normalizedTarget
    })
    .from(chapterSummaryLinks)
    .innerJoin(sourceSubparts, eq(chapterSummaryLinks.sourceSubpartId, sourceSubparts.id))
    .innerJoin(sourceChapters, eq(sourceSubparts.chapterId, sourceChapters.id))
    .innerJoin(targetSubparts, eq(chapterSummaryLinks.targetSubpartId, targetSubparts.id))
    .where(eq(targetSubparts.chapterId, parsedParams.data.id))
    .orderBy(asc(sourceChapters.title));

  const backlinkRows: Array<{
    sourceChapterId: number;
    sourceChapterTitle: string;
    normalizedTarget: string;
  }> = [];
  const seenBacklinks = new Set<string>();
  for (const row of backlinkRowsRaw) {
    const key = `${row.sourceChapterId}-${row.normalizedTarget}`;
    if (seenBacklinks.has(key)) {
      continue;
    }
    seenBacklinks.add(key);
    backlinkRows.push(row);
  }

  res.status(200).json({
    links: {
      outgoing: outgoingRows,
      backlinks: backlinkRows
    }
  });
});

adminRouter.get("/content/chapters/:id/summary", requireSession, async (req, res) => {
  const parsedParams = chapterParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid chapter identifier",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const chapterRows = await db
    .select({
      id: chapters.id,
      title: chapters.title,
      summary: chapters.summary
    })
    .from(chapters)
    .where(eq(chapters.id, parsedParams.data.id))
    .limit(1);

  const chapter = chapterRows[0];
  if (!chapter) {
    res.status(404).json({
      error: "Chapter not found"
    });
    return;
  }

  res.status(200).json({
    chapter
  });
});

adminRouter.get("/content/chapters/:id/subparts", requireSession, async (req, res) => {
  const parsedParams = chapterParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid chapter identifier",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const chapterRows = await db
    .select({
      id: chapters.id,
      chapterNumber: chapters.chapterNumber,
      title: chapters.title
    })
    .from(chapters)
    .where(eq(chapters.id, parsedParams.data.id))
    .limit(1);

  const chapter = chapterRows[0];
  if (!chapter) {
    res.status(404).json({
      error: "Chapter not found"
    });
    return;
  }

  const subparts = await db
    .select({
      id: chapterSubparts.id,
      chapterId: chapterSubparts.chapterId,
      orderIndex: chapterSubparts.orderIndex,
      heading: chapterSubparts.heading,
      content: chapterSubparts.content,
      createdAt: chapterSubparts.createdAt,
      updatedAt: chapterSubparts.updatedAt
    })
    .from(chapterSubparts)
    .where(eq(chapterSubparts.chapterId, chapter.id))
    .orderBy(asc(chapterSubparts.orderIndex), asc(chapterSubparts.id));

  res.status(200).json({
    chapter,
    subparts
  });
});

adminRouter.post("/content/chapters/:id/subparts", requireSession, async (req, res) => {
  const parsedParams = chapterParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid chapter identifier",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const parsedBody = chapterSubpartCreateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid chapter subpart payload",
      details: parsedBody.error.flatten()
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;
  const action = "Create chapter subpart";
  const fallbackTarget = `Chapter #${parsedParams.data.id}`;

  const chapterRows = await db
    .select({
      id: chapters.id,
      title: chapters.title,
      subjectId: chapters.subjectId,
      subjectName: subjects.name
    })
    .from(chapters)
    .innerJoin(subjects, eq(chapters.subjectId, subjects.id))
    .where(eq(chapters.id, parsedParams.data.id))
    .limit(1);

  const chapter = chapterRows[0];
  if (!chapter) {
    await persistAuditLog({
      scope: "content",
      action,
      target: fallbackTarget,
      status: "failed",
      message: "Chapter not found",
      actorId,
      actorName
    });
    res.status(404).json({
      error: "Chapter not found"
    });
    return;
  }

  let createdSubpart:
    | {
        id: number;
        chapterId: number;
        orderIndex: number;
        heading: string;
        content: string;
        createdAt: Date;
        updatedAt: Date;
      }
    | null = null;

  try {
    createdSubpart = await db.transaction(async (tx) => {
      const existingRows = await tx
        .select({
          id: chapterSubparts.id,
          orderIndex: chapterSubparts.orderIndex
        })
        .from(chapterSubparts)
        .where(eq(chapterSubparts.chapterId, chapter.id))
        .orderBy(asc(chapterSubparts.orderIndex), asc(chapterSubparts.id));

      const maxOrderIndex = existingRows.reduce((max, row) => Math.max(max, row.orderIndex), 0);
      let nextOrderIndex = parsedBody.data.orderIndex ?? maxOrderIndex + 1;

      if (nextOrderIndex < 1) {
        nextOrderIndex = 1;
      }
      if (nextOrderIndex > maxOrderIndex + 1) {
        nextOrderIndex = maxOrderIndex + 1;
      }

      if (existingRows.some((row) => row.orderIndex >= nextOrderIndex)) {
        const shiftedRows = [...existingRows]
          .filter((row) => row.orderIndex >= nextOrderIndex)
          .sort((left, right) => right.orderIndex - left.orderIndex || right.id - left.id);

        for (const row of shiftedRows) {
          await tx
            .update(chapterSubparts)
            .set({
              orderIndex: row.orderIndex + 1,
              updatedAt: new Date()
            })
            .where(eq(chapterSubparts.id, row.id));
        }
      }

      const insertedRows = await tx
        .insert(chapterSubparts)
        .values({
          chapterId: chapter.id,
          orderIndex: nextOrderIndex,
          heading: parsedBody.data.heading.trim(),
          content: parsedBody.data.content.trim()
        })
        .returning({
          id: chapterSubparts.id,
          chapterId: chapterSubparts.chapterId,
          orderIndex: chapterSubparts.orderIndex,
          heading: chapterSubparts.heading,
          content: chapterSubparts.content,
          createdAt: chapterSubparts.createdAt,
          updatedAt: chapterSubparts.updatedAt
        });

      const inserted = insertedRows[0];
      if (!inserted) {
        throw new Error("Failed to create chapter subpart");
      }

      return inserted;
    });
  } catch (error) {
    await persistAuditLog({
      scope: "content",
      action,
      target: `${chapter.subjectName} / ${chapter.title}`,
      status: "failed",
      message: error instanceof Error ? error.message : "Chapter subpart create failed",
      actorId,
      actorName
    });
    res.status(500).json({
      error: "Failed to create chapter subpart"
    });
    return;
  }

  if (!createdSubpart) {
    res.status(500).json({
      error: "Failed to create chapter subpart"
    });
    return;
  }

  res.status(201).json({
    subpart: createdSubpart,
    timestamp: new Date().toISOString()
  });

  try {
    await rebuildChapterSummaryLinks({
      sourceChapterId: chapter.id,
      sourceSubjectId: chapter.subjectId
    });

    await cacheService.delete(CacheKeys.chapterContent(chapter.id));

    await rebuildInboundChapterLinks({
      targetChapterId: chapter.id
    });
  } catch (error) {
    console.error("Post-commit chapter subpart create hooks failed:", error);
  }

  try {
    await persistAuditLog({
      scope: "content",
      action,
      target: `${chapter.subjectName} / ${chapter.title}`,
      status: "success",
      message: `Created subpart ${createdSubpart.id} (${createdSubpart.heading})`,
      actorId,
      actorName
    });
  } catch (error) {
    console.error("Failed to write chapter subpart create audit log:", error);
  }
});

adminRouter.post("/content/chapters/:id/subparts/reorder", requireSession, async (req, res) => {
  const parsedParams = chapterParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid chapter identifier",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const parsedBody = chapterSubpartReorderBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid chapter subpart reorder payload",
      details: parsedBody.error.flatten()
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;
  const action = "Reorder chapter subparts";
  const fallbackTarget = `Chapter #${parsedParams.data.id}`;

  const chapterRows = await db
    .select({
      id: chapters.id,
      title: chapters.title,
      subjectId: chapters.subjectId,
      subjectName: subjects.name
    })
    .from(chapters)
    .innerJoin(subjects, eq(chapters.subjectId, subjects.id))
    .where(eq(chapters.id, parsedParams.data.id))
    .limit(1);

  const chapter = chapterRows[0];
  if (!chapter) {
    await persistAuditLog({
      scope: "content",
      action,
      target: fallbackTarget,
      status: "failed",
      message: "Chapter not found",
      actorId,
      actorName
    });
    res.status(404).json({
      error: "Chapter not found"
    });
    return;
  }

  const existingRows = await db
    .select({
      id: chapterSubparts.id
    })
    .from(chapterSubparts)
    .where(eq(chapterSubparts.chapterId, chapter.id));

  const existingIds = existingRows.map((row) => row.id);
  const proposedIds = parsedBody.data.subpartIds;

  if (existingIds.length !== proposedIds.length) {
    res.status(400).json({
      error: "Reorder payload must contain all chapter subpart IDs exactly once"
    });
    return;
  }

  const proposedIdSet = new Set(proposedIds);
  if (proposedIdSet.size !== proposedIds.length) {
    res.status(400).json({
      error: "Reorder payload contains duplicate subpart IDs"
    });
    return;
  }

  if (!existingIds.every((id) => proposedIdSet.has(id))) {
    res.status(400).json({
      error: "Reorder payload contains invalid subpart IDs for this chapter"
    });
    return;
  }

  let reorderedRows:
    | Array<{
        id: number;
        chapterId: number;
        orderIndex: number;
        heading: string;
        content: string;
        createdAt: Date;
        updatedAt: Date;
      }>
    | null = null;

  try {
    reorderedRows = await db.transaction(async (tx) => {
      const reorderOffset = proposedIds.length + 1;
      const reorderedAt = new Date();

      await tx
        .update(chapterSubparts)
        .set({
          orderIndex: sql`${chapterSubparts.orderIndex} + ${reorderOffset}`,
          updatedAt: reorderedAt
        })
        .where(eq(chapterSubparts.chapterId, chapter.id));

      for (const [index, subpartId] of proposedIds.entries()) {
        await tx
          .update(chapterSubparts)
          .set({
            orderIndex: index + 1,
            updatedAt: reorderedAt
          })
          .where(and(eq(chapterSubparts.chapterId, chapter.id), eq(chapterSubparts.id, subpartId)));
      }

      return tx
        .select({
          id: chapterSubparts.id,
          chapterId: chapterSubparts.chapterId,
          orderIndex: chapterSubparts.orderIndex,
          heading: chapterSubparts.heading,
          content: chapterSubparts.content,
          createdAt: chapterSubparts.createdAt,
          updatedAt: chapterSubparts.updatedAt
        })
        .from(chapterSubparts)
        .where(eq(chapterSubparts.chapterId, chapter.id))
        .orderBy(asc(chapterSubparts.orderIndex), asc(chapterSubparts.id));
    });
  } catch (error) {
    await persistAuditLog({
      scope: "content",
      action,
      target: `${chapter.subjectName} / ${chapter.title}`,
      status: "failed",
      message: error instanceof Error ? error.message : "Chapter subpart reorder failed",
      actorId,
      actorName
    });
    res.status(500).json({
      error: "Failed to reorder chapter subparts"
    });
    return;
  }

  if (!reorderedRows) {
    res.status(500).json({
      error: "Failed to reorder chapter subparts"
    });
    return;
  }

  res.status(200).json({
    subparts: reorderedRows,
    timestamp: new Date().toISOString()
  });

  try {
    await rebuildChapterSummaryLinks({
      sourceChapterId: chapter.id,
      sourceSubjectId: chapter.subjectId
    });

    await cacheService.delete(CacheKeys.chapterContent(chapter.id));

    await rebuildInboundChapterLinks({
      targetChapterId: chapter.id
    });
  } catch (error) {
    console.error("Post-commit chapter subpart reorder hooks failed:", error);
  }

  try {
    await persistAuditLog({
      scope: "content",
      action,
      target: `${chapter.subjectName} / ${chapter.title}`,
      status: "success",
      message: `Reordered ${proposedIds.length} subparts`,
      actorId,
      actorName
    });
  } catch (error) {
    console.error("Failed to write chapter subpart reorder audit log:", error);
  }
});

adminRouter.post("/content/chapters/:id/subparts/:subpartId", requireSession, async (req, res) => {
  const parsedParams = chapterSubpartParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid chapter or subpart identifier",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const parsedBody = chapterSubpartUpdateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid chapter subpart update payload",
      details: parsedBody.error.flatten()
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;
  const action = "Update chapter subpart";
  const fallbackTarget = `Chapter #${parsedParams.data.id} / Subpart #${parsedParams.data.subpartId}`;

  const subpartRows = await db
    .select({
      id: chapterSubparts.id,
      chapterId: chapterSubparts.chapterId,
      orderIndex: chapterSubparts.orderIndex,
      heading: chapterSubparts.heading,
      content: chapterSubparts.content,
      chapterTitle: chapters.title,
      subjectId: chapters.subjectId,
      subjectName: subjects.name
    })
    .from(chapterSubparts)
    .innerJoin(chapters, eq(chapterSubparts.chapterId, chapters.id))
    .innerJoin(subjects, eq(chapters.subjectId, subjects.id))
    .where(and(eq(chapterSubparts.id, parsedParams.data.subpartId), eq(chapterSubparts.chapterId, parsedParams.data.id)))
    .limit(1);

  const subpart = subpartRows[0];
  if (!subpart) {
    await persistAuditLog({
      scope: "content",
      action,
      target: fallbackTarget,
      status: "failed",
      message: "Chapter subpart not found",
      actorId,
      actorName
    });
    res.status(404).json({
      error: "Chapter subpart not found"
    });
    return;
  }

  let updatedSubpart:
    | {
        id: number;
        chapterId: number;
        orderIndex: number;
        heading: string;
        content: string;
        createdAt: Date;
        updatedAt: Date;
      }
    | null = null;

  try {
    const updatedRows = await db
      .update(chapterSubparts)
      .set({
        heading: parsedBody.data.heading.trim(),
        content: parsedBody.data.content.trim(),
        updatedAt: new Date()
      })
      .where(eq(chapterSubparts.id, subpart.id))
      .returning({
        id: chapterSubparts.id,
        chapterId: chapterSubparts.chapterId,
        orderIndex: chapterSubparts.orderIndex,
        heading: chapterSubparts.heading,
        content: chapterSubparts.content,
        createdAt: chapterSubparts.createdAt,
        updatedAt: chapterSubparts.updatedAt
      });

    updatedSubpart = updatedRows[0] ?? null;
    if (!updatedSubpart) {
      res.status(500).json({
        error: "Failed to update chapter subpart"
      });
      return;
    }
  } catch (error) {
    await persistAuditLog({
      scope: "content",
      action,
      target: `${subpart.subjectName} / ${subpart.chapterTitle}`,
      status: "failed",
      message: error instanceof Error ? error.message : "Chapter subpart update failed",
      actorId,
      actorName
    });
    res.status(500).json({
      error: "Failed to update chapter subpart"
    });
    return;
  }

  if (!updatedSubpart) {
    res.status(500).json({
      error: "Failed to update chapter subpart"
    });
    return;
  }

  res.status(200).json({
    subpart: updatedSubpart,
    timestamp: new Date().toISOString()
  });

  try {
    await rebuildChapterSummaryLinks({
      sourceChapterId: subpart.chapterId,
      sourceSubjectId: subpart.subjectId
    });

    await cacheService.delete(CacheKeys.chapterContent(subpart.chapterId));

    await rebuildInboundChapterLinks({
      targetChapterId: subpart.chapterId
    });
  } catch (error) {
    console.error("Post-commit chapter subpart update hooks failed:", error);
  }

  try {
    await persistAuditLog({
      scope: "content",
      action,
      target: `${subpart.subjectName} / ${subpart.chapterTitle}`,
      status: "success",
      message: `Updated subpart ${updatedSubpart.id} (${updatedSubpart.heading})`,
      actorId,
      actorName
    });
  } catch (error) {
    console.error("Failed to write chapter subpart update audit log:", error);
  }
});

adminRouter.post("/content/chapters/:id/subparts/:subpartId/delete", requireSession, async (req, res) => {
  const parsedParams = chapterSubpartParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid chapter or subpart identifier",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;
  const action = "Delete chapter subpart";
  const fallbackTarget = `Chapter #${parsedParams.data.id} / Subpart #${parsedParams.data.subpartId}`;

  const subpartRows = await db
    .select({
      id: chapterSubparts.id,
      chapterId: chapterSubparts.chapterId,
      orderIndex: chapterSubparts.orderIndex,
      heading: chapterSubparts.heading,
      chapterTitle: chapters.title,
      subjectId: chapters.subjectId,
      subjectName: subjects.name
    })
    .from(chapterSubparts)
    .innerJoin(chapters, eq(chapterSubparts.chapterId, chapters.id))
    .innerJoin(subjects, eq(chapters.subjectId, subjects.id))
    .where(and(eq(chapterSubparts.id, parsedParams.data.subpartId), eq(chapterSubparts.chapterId, parsedParams.data.id)))
    .limit(1);

  const subpart = subpartRows[0];
  if (!subpart) {
    await persistAuditLog({
      scope: "content",
      action,
      target: fallbackTarget,
      status: "failed",
      message: "Chapter subpart not found",
      actorId,
      actorName
    });
    res.status(404).json({
      error: "Chapter subpart not found"
    });
    return;
  }

  try {
    await db.transaction(async (tx) => {
      await tx.delete(chapterSubparts).where(eq(chapterSubparts.id, subpart.id));

      const remainingRows = await tx
        .select({
          id: chapterSubparts.id
        })
        .from(chapterSubparts)
        .where(eq(chapterSubparts.chapterId, subpart.chapterId))
        .orderBy(asc(chapterSubparts.orderIndex), asc(chapterSubparts.id));

      for (const [index, row] of remainingRows.entries()) {
        await tx
          .update(chapterSubparts)
          .set({
            orderIndex: index + 1,
            updatedAt: new Date()
          })
          .where(eq(chapterSubparts.id, row.id));
      }
    });
  } catch (error) {
    await persistAuditLog({
      scope: "content",
      action,
      target: `${subpart.subjectName} / ${subpart.chapterTitle}`,
      status: "failed",
      message: error instanceof Error ? error.message : "Chapter subpart delete failed",
      actorId,
      actorName
    });
    res.status(500).json({
      error: "Failed to delete chapter subpart"
    });
    return;
  }

  res.status(200).json({
    success: true,
    deletedId: subpart.id,
    timestamp: new Date().toISOString()
  });

  try {
    await rebuildChapterSummaryLinks({
      sourceChapterId: subpart.chapterId,
      sourceSubjectId: subpart.subjectId
    });

    await cacheService.delete(CacheKeys.chapterContent(subpart.chapterId));

    await rebuildInboundChapterLinks({
      targetChapterId: subpart.chapterId
    });
  } catch (error) {
    console.error("Post-commit chapter subpart delete hooks failed:", error);
  }

  try {
    await persistAuditLog({
      scope: "content",
      action,
      target: `${subpart.subjectName} / ${subpart.chapterTitle}`,
      status: "success",
      message: `Deleted subpart ${subpart.id} (${subpart.heading})`,
      actorId,
      actorName
    });
  } catch (error) {
    console.error("Failed to write chapter subpart delete audit log:", error);
  }
});

adminRouter.post("/content/chapters/:id/summary", requireSession, async (req, res) => {
  const parsedParams = chapterParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid chapter identifier",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  res.status(410).json({
    error: "Chapter summary markdown endpoint is deprecated. Use chapter subparts endpoints instead."
  });
});

adminRouter.get("/content/chapters/:id/revision-notes", requireSession, async (req, res) => {
  const parsedParams = chapterParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid chapter identifier",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const chapterRows = await db
    .select({
      id: chapters.id,
      title: chapters.title,
      keyFormulas: revisionNotes.keyFormulas,
      keyDefinitions: revisionNotes.keyDefinitions,
      commonMistakes: revisionNotes.commonMistakes,
      examTips: revisionNotes.examTips
    })
    .from(chapters)
    .leftJoin(revisionNotes, eq(revisionNotes.chapterId, chapters.id))
    .where(eq(chapters.id, parsedParams.data.id))
    .limit(1);

  const chapter = chapterRows[0];
  if (!chapter) {
    res.status(404).json({
      error: "Chapter not found"
    });
    return;
  }

  res.status(200).json({
    chapter: {
      id: chapter.id,
      title: chapter.title
    },
    revisionNotes: {
      keyFormulas: chapter.keyFormulas ?? [],
      keyDefinitions: chapter.keyDefinitions ?? [],
      commonMistakes: chapter.commonMistakes ?? "",
      examTips: chapter.examTips ?? ""
    }
  });
});

adminRouter.post("/content/chapters/:id/revision-notes", requireSession, async (req, res) => {
  const parsedParams = chapterParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid chapter identifier",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const parsedBody = chapterRevisionNotesBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid revision notes payload",
      details: parsedBody.error.flatten()
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;
  const action = "Update chapter revision notes";
  const fallbackTarget = `Chapter #${parsedParams.data.id}`;

  const chapterRows = await db
    .select({
      id: chapters.id,
      title: chapters.title,
      subjectId: chapters.subjectId,
      subjectName: subjects.name
    })
    .from(chapters)
    .innerJoin(subjects, eq(chapters.subjectId, subjects.id))
    .where(eq(chapters.id, parsedParams.data.id))
    .limit(1);

  const chapter = chapterRows[0];
  if (!chapter) {
    await persistAuditLog({
      scope: "content",
      action,
      target: fallbackTarget,
      status: "failed",
      message: "Chapter not found",
      actorId,
      actorName
    });
    res.status(404).json({
      error: "Chapter not found"
    });
    return;
  }

  const payload = {
    keyFormulas: parsedBody.data.keyFormulas,
    keyDefinitions: parsedBody.data.keyDefinitions,
    commonMistakes: parsedBody.data.commonMistakes.trim() || null,
    examTips: parsedBody.data.examTips.trim() || null
  };

  const upsertedRows = await db
    .insert(revisionNotes)
    .values({
      chapterId: chapter.id,
      ...payload
    })
    .onConflictDoUpdate({
      target: revisionNotes.chapterId,
      set: payload
    })
    .returning({
      keyFormulas: revisionNotes.keyFormulas,
      keyDefinitions: revisionNotes.keyDefinitions,
      commonMistakes: revisionNotes.commonMistakes,
      examTips: revisionNotes.examTips
    });

  const updatedRevisionNotes = upsertedRows[0];
  if (!updatedRevisionNotes) {
    await persistAuditLog({
      scope: "content",
      action,
      target: `${chapter.subjectName} / ${chapter.title}`,
      status: "failed",
      message: "Revision notes update failed",
      actorId,
      actorName
    });
    res.status(500).json({
      error: "Failed to update revision notes"
    });
    return;
  }

  await cacheService.delete(CacheKeys.chapterContent(chapter.id));

  await persistAuditLog({
    scope: "content",
    action,
    target: `${chapter.subjectName} / ${chapter.title}`,
    status: "success",
    message: "Updated chapter revision notes",
    actorId,
    actorName
  });

  res.status(200).json({
    chapter: {
      id: chapter.id,
      title: chapter.title
    },
    revisionNotes: {
      keyFormulas: updatedRevisionNotes.keyFormulas ?? [],
      keyDefinitions: updatedRevisionNotes.keyDefinitions ?? [],
      commonMistakes: updatedRevisionNotes.commonMistakes ?? "",
      examTips: updatedRevisionNotes.examTips ?? ""
    },
    timestamp: new Date().toISOString()
  });
});

adminRouter.post("/content/chapters/:id/rename", requireSession, async (req, res) => {
  const parsedParams = chapterParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid chapter identifier",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const parsedBody = chapterRenameBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid chapter rename payload",
      details: parsedBody.error.flatten()
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;
  const action = "Rename chapter";
  const fallbackTarget = `Chapter #${parsedParams.data.id}`;

  const chapterRows = await db
    .select({
      id: chapters.id,
      title: chapters.title,
      subjectId: chapters.subjectId,
      subjectName: subjects.name
    })
    .from(chapters)
    .innerJoin(subjects, eq(chapters.subjectId, subjects.id))
    .where(eq(chapters.id, parsedParams.data.id))
    .limit(1);
  const chapter = chapterRows[0];
  if (!chapter) {
    await persistAuditLog({
      scope: "content",
      action,
      target: fallbackTarget,
      status: "failed",
      message: "Chapter not found",
      actorId,
      actorName
    });
    res.status(404).json({
      error: "Chapter not found"
    });
    return;
  }

  const nextTitle = parsedBody.data.title.trim();
  const nextSlug = parsedBody.data.slug.trim().toLowerCase();
  const updatedRows = await db
    .update(chapters)
    .set({
      title: nextTitle,
      slug: nextSlug
    })
    .where(eq(chapters.id, chapter.id))
    .returning({
      id: chapters.id,
      title: chapters.title,
      slug: chapters.slug
    });
  const updatedChapter = updatedRows[0];
  if (!updatedChapter) {
    await persistAuditLog({
      scope: "content",
      action,
      target: `${chapter.subjectName} / ${chapter.title}`,
      status: "failed",
      message: "Chapter rename failed",
      actorId,
      actorName
    });
    res.status(500).json({
      error: "Failed to rename chapter"
    });
    return;
  }

  await ensureChapterTitleAlias({
    chapterId: chapter.id,
    aliasTitle: chapter.title
  });
  await ensureChapterTitleAlias({
    chapterId: chapter.id,
    aliasTitle: updatedChapter.title
  });
  await refreshLinksForChapterAliases({
    chapterId: chapter.id
  });

  // Invalidate chapter content cache + chapter list for subject
  await cacheService.delete(CacheKeys.chapterContent(chapter.id));
  await cacheService.delete(CacheKeys.chapterList(chapter.subjectId));

  await persistAuditLog({
    scope: "content",
    action,
    target: `${chapter.subjectName} / ${chapter.title}`,
    status: "success",
    message: `Renamed chapter to ${updatedChapter.title}`,
    actorId,
    actorName
  });

  res.status(200).json({
    chapter: updatedChapter,
    timestamp: new Date().toISOString()
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
      subjectId: chapters.subjectId,
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

  // Invalidate chapter content cache + chapter list for subject + learn hierarchy
  await cacheService.delete(CacheKeys.chapterContent(chapterRow.id));
  await cacheService.delete(CacheKeys.chapterList(chapterRow.subjectId));
  await cacheService.invalidatePattern("learn:*");

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

adminRouter.get("/content/audit-logs", requireSession, async (req, res) => {
  await handleAuditLogRead(req as AuthenticatedRequest, res, "content");
});

adminRouter.get("/forum/audit-logs", requireSession, async (req, res) => {
  await handleAuditLogRead(req as AuthenticatedRequest, res, "forum");
});

adminRouter.get("/moderation/audit-logs", requireSession, async (req, res) => {
  await handleAuditLogRead(req as AuthenticatedRequest, res, "moderation");
});

adminRouter.get("/users/audit-logs", requireSession, async (req, res) => {
  await handleAuditLogRead(req as AuthenticatedRequest, res, "users");
});

adminRouter.get("/notifications/audit-logs", requireSession, async (req, res) => {
  await handleAuditLogRead(req as AuthenticatedRequest, res, "notifications");
});

adminRouter.get("/settings/audit-logs", requireSession, async (req, res) => {
  await handleAuditLogRead(req as AuthenticatedRequest, res, "settings");
});

adminRouter.get("/audit-logs", requireSession, async (req, res) => {
  await handleAggregatedAuditLogRead(req as AuthenticatedRequest, res);
});

adminRouter.get("/jobs/stats", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const stats = await Promise.all(
    jobRegistry.map(async (def) => {
      const queue = def.getQueue();
      const [waiting, active, completed, failed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
      ]);
      return {
        name: def.name,
        queue: queue.name,
        counts: { waiting, active, completed, failed },
      };
    })
  );
  res.json({ jobs: stats });
});

adminRouter.post("/jobs/:queueName/:jobId/retry", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const { queueName, jobId } = req.params;
  
  if (Array.isArray(jobId) || !jobId) {
    res.status(400).json({ error: "Invalid job ID" });
    return;
  }

  const queue = getAllQueues().find((q) => q.name === queueName);

  if (!queue) {
    res.status(404).json({ error: "Queue not found" });
    return;
  }

  const job = await queue.getJob(jobId);
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  await job.retry();
  res.json({ success: true, jobId });
});

// ==================== CACHE MANAGEMENT ====================

/**
 * GET /api/admin/cache/stats - Cache statistics (hit rate, miss rate, eviction counts)
 */
adminRouter.get("/cache/stats", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const stats = cacheService.getStats();
  res.status(200).json({ data: stats });
});

/**
 * POST /api/admin/cache/purge - Purge all cache entries
 */
adminRouter.post("/cache/purge", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const deleted = await cacheService.purgeAll();

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;

  await persistAuditLog({
    scope: "settings",
    action: "Purge cache",
    target: "All cache entries",
    status: "success",
    message: `Purged ${deleted} cache entries`,
    actorId,
    actorName
  });

  res.status(200).json({
    success: true,
    deletedCount: deleted,
    timestamp: new Date().toISOString()
  });
});

// ==================== PAST PAPER CONTENT CRUD ====================

/**
 * GET /api/admin/content/past-papers - List all past papers (with markdown content)
 * Optional query: ?boardId=N&grade=9|10&subjectId=N&year=N
 */
adminRouter.get("/content/past-papers", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedQuery = pastPaperListQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({
      error: "Invalid past paper query",
      details: parsedQuery.error.flatten()
    });
    return;
  }

  const conditions: SQL[] = [];
  if (parsedQuery.data.boardId) {
    conditions.push(eq(mockExams.boardId, parsedQuery.data.boardId));
  }
  if (parsedQuery.data.grade) {
    conditions.push(eq(mockExams.grade, parsedQuery.data.grade));
  }
  if (parsedQuery.data.subjectId) {
    conditions.push(eq(mockExams.subjectId, parsedQuery.data.subjectId));
  }
  if (parsedQuery.data.year) {
    conditions.push(eq(mockExams.year, parsedQuery.data.year));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: mockExams.id,
      title: mockExams.title,
      boardId: mockExams.boardId,
      boardName: boards.name,
      grade: mockExams.grade,
      subjectId: mockExams.subjectId,
      subjectName: subjects.name,
      year: mockExams.year,
      durationMinutes: mockExams.durationMinutes,
      totalMarks: mockExams.totalMarks,
      paperContent: mockExams.paperContent,
      solutionContent: mockExams.solutionContent,
      published: mockExams.published,
      description: mockExams.description
    })
    .from(mockExams)
    .innerJoin(boards, eq(mockExams.boardId, boards.id))
    .innerJoin(subjects, eq(mockExams.subjectId, subjects.id))
    .where(whereClause)
    .orderBy(desc(mockExams.year), asc(mockExams.title));

  res.status(200).json({
    data: rows,
    total: rows.length
  });
});

/**
 * POST /api/admin/content/past-papers - Create a past paper with markdown content
 */
adminRouter.post("/content/past-papers", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedBody = pastPaperCreateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid past paper payload",
      details: parsedBody.error.flatten()
    });
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;

  // We need a dummy quiz for the NOT NULL quizId constraint.
  // Find the first chapter for this subject to use as chapterId.
  const chapterRows = await db
    .select({ id: chapters.id })
    .from(chapters)
    .where(eq(chapters.subjectId, parsedBody.data.subjectId))
    .limit(1);

  const firstChapter = chapterRows[0];
  if (!firstChapter) {
    await persistAuditLog({
      scope: "content",
      action: "Create past paper",
      target: `Subject #${parsedBody.data.subjectId}`,
      status: "failed",
      message: "No chapters found for subject — needed for placeholder quiz",
      actorId,
      actorName
    });
    res.status(400).json({ error: "Subject must have at least one chapter before adding a past paper" });
    return;
  }

  // Create a placeholder quiz that won't be used for the markdown-based past paper.
  const placeholderQuizRows = await db
    .insert(quizzes)
    .values({
      title: `[Past Paper] ${parsedBody.data.title}`,
      chapterId: firstChapter.id,
      type: "mock_exam",
      durationMinutes: 0,
      totalMarks: 0
    })
    .returning({ id: quizzes.id });

  const placeholderQuiz = placeholderQuizRows[0];
  if (!placeholderQuiz) {
    await persistAuditLog({
      scope: "content",
      action: "Create past paper",
      target: `Subject #${parsedBody.data.subjectId}`,
      status: "failed",
      message: "Failed to create placeholder quiz for past paper",
      actorId,
      actorName
    });
    res.status(500).json({ error: "Failed to create past paper" });
    return;
  }

  const insertedRows = await db
    .insert(mockExams)
    .values({
      title: parsedBody.data.title.trim(),
      boardId: parsedBody.data.boardId,
      grade: parsedBody.data.grade,
      subjectId: parsedBody.data.subjectId,
      year: parsedBody.data.year,
      quizId: placeholderQuiz.id,
      durationMinutes: parsedBody.data.durationMinutes ?? 60,
      totalMarks: parsedBody.data.totalMarks ?? 0,
      paperContent: parsedBody.data.paperContent?.trim() ?? null,
      solutionContent: parsedBody.data.solutionContent?.trim() ?? null,
      published: parsedBody.data.published ?? false,
      description: parsedBody.data.description?.trim() ?? null
    })
    .returning({
      id: mockExams.id,
      title: mockExams.title,
      boardId: mockExams.boardId,
      grade: mockExams.grade,
      subjectId: mockExams.subjectId,
      year: mockExams.year,
      durationMinutes: mockExams.durationMinutes,
      totalMarks: mockExams.totalMarks,
      paperContent: mockExams.paperContent,
      solutionContent: mockExams.solutionContent,
      published: mockExams.published,
      description: mockExams.description
    });

  const newPaper = insertedRows[0];
  if (!newPaper) {
    await persistAuditLog({
      scope: "content",
      action: "Create past paper",
      target: `Subject #${parsedBody.data.subjectId}`,
      status: "failed",
      message: "Past paper creation failed",
      actorId,
      actorName
    });
    res.status(500).json({ error: "Failed to create past paper" });
    return;
  }

  await persistAuditLog({
    scope: "content",
    action: "Create past paper",
    target: `Past Paper #${newPaper.id}`,
    status: "success",
    message: `Created past paper "${newPaper.title}" for year ${newPaper.year}`,
    actorId,
    actorName
  });

  // Link exercises if provided
  for (const ex of parsedBody.data.exercises) {
    await pastPaperRepository.linkExercise(newPaper.id, ex.exerciseId, ex.orderIndex, ex.marks);
  }

  res.status(201).json({
    data: newPaper
  });
});

/**
 * POST /api/admin/content/past-papers/:id/update - Update a past paper
 */
adminRouter.post("/content/past-papers/:id/update", requireSession, async (req, res) => {
  const parsedParams = curriculumEntityParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid past paper identifier",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedBody = pastPaperUpdateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid past paper payload",
      details: parsedBody.error.flatten()
    });
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;

  // Check if past paper exists
  const existingRows = await db
    .select({ id: mockExams.id })
    .from(mockExams)
    .where(eq(mockExams.id, parsedParams.data.id))
    .limit(1);

  const existing = existingRows[0];
  if (!existing) {
    await persistAuditLog({
      scope: "content",
      action: "Update past paper",
      target: `Past Paper #${parsedParams.data.id}`,
      status: "failed",
      message: "Past paper not found",
      actorId,
      actorName
    });
    res.status(404).json({ error: "Past paper not found" });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsedBody.data.title !== undefined) updateData.title = parsedBody.data.title.trim();
  if (parsedBody.data.boardId !== undefined) updateData.boardId = parsedBody.data.boardId;
  if (parsedBody.data.grade !== undefined) updateData.grade = parsedBody.data.grade;
  if (parsedBody.data.subjectId !== undefined) updateData.subjectId = parsedBody.data.subjectId;
  if (parsedBody.data.year !== undefined) updateData.year = parsedBody.data.year;
  if (parsedBody.data.paperContent !== undefined) updateData.paperContent = parsedBody.data.paperContent.trim();
  if (parsedBody.data.solutionContent !== undefined) updateData.solutionContent = parsedBody.data.solutionContent.trim();
  if (parsedBody.data.published !== undefined) updateData.published = parsedBody.data.published;
  if (parsedBody.data.description !== undefined) updateData.description = parsedBody.data.description?.trim() ?? null;
  if (parsedBody.data.durationMinutes !== undefined) updateData.durationMinutes = parsedBody.data.durationMinutes;
  if (parsedBody.data.totalMarks !== undefined) updateData.totalMarks = parsedBody.data.totalMarks;

  const updatedRows = await db
    .update(mockExams)
    .set(updateData)
    .where(eq(mockExams.id, existing.id))
    .returning({
      id: mockExams.id,
      title: mockExams.title,
      boardId: mockExams.boardId,
      grade: mockExams.grade,
      subjectId: mockExams.subjectId,
      year: mockExams.year,
      durationMinutes: mockExams.durationMinutes,
      totalMarks: mockExams.totalMarks,
      paperContent: mockExams.paperContent,
      solutionContent: mockExams.solutionContent,
      published: mockExams.published,
      description: mockExams.description
    });

  const updatedPaper = updatedRows[0];
  if (!updatedPaper) {
    await persistAuditLog({
      scope: "content",
      action: "Update past paper",
      target: `Past Paper #${existing.id}`,
      status: "failed",
      message: "Past paper update failed",
      actorId,
      actorName
    });
    res.status(500).json({ error: "Failed to update past paper" });
    return;
  }

  await persistAuditLog({
    scope: "content",
    action: "Update past paper",
    target: `Past Paper #${updatedPaper.id}`,
    status: "success",
    message: `Updated past paper "${updatedPaper.title}"`,
    actorId,
    actorName
  });

  res.status(200).json({
    data: updatedPaper
  });
});

/**
 * POST /api/admin/content/past-papers/:id/delete - Delete a past paper
 */
adminRouter.post("/content/past-papers/:id/delete", requireSession, async (req, res) => {
  const parsedParams = curriculumEntityParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid past paper identifier",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;

  const paperRows = await db
    .select({
      id: mockExams.id,
      title: mockExams.title,
      quizId: mockExams.quizId,
      subjectId: mockExams.subjectId
    })
    .from(mockExams)
    .where(eq(mockExams.id, parsedParams.data.id))
    .limit(1);

  const paper = paperRows[0];
  if (!paper) {
    await persistAuditLog({
      scope: "content",
      action: "Delete past paper",
      target: `Past Paper #${parsedParams.data.id}`,
      status: "failed",
      message: "Past paper not found",
      actorId,
      actorName
    });
    res.status(404).json({ error: "Past paper not found" });
    return;
  }

  // Delete the mock exam (cascade will handle quiz via quizId FK)
  await db.delete(mockExams).where(eq(mockExams.id, paper.id));

  await persistAuditLog({
    scope: "content",
    action: "Delete past paper",
    target: `Past Paper #${paper.id} "${paper.title}"`,
    status: "success",
    message: `Deleted past paper from subject ${paper.subjectId}`,
    actorId,
    actorName
  });

  res.status(200).json({
    success: true,
    deletedId: paper.id
  });
});

// GET /api/admin/content/past-papers/:id/exercises
adminRouter.get("/content/past-papers/:id/exercises", requireSession, async (req, res) => {
  const parsedParams = curriculumEntityParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({ error: "Invalid paper ID", details: parsedParams.error.flatten() });
    return;
  }
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) return;

  const exerciseRows = await pastPaperRepository.getPaperExercises(parsedParams.data.id);
  res.status(200).json({ data: exerciseRows });
});

// POST /api/admin/content/past-papers/:id/exercises
adminRouter.post("/content/past-papers/:id/exercises", requireSession, async (req, res) => {
  const parsedParams = curriculumEntityParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({ error: "Invalid paper ID", details: parsedParams.error.flatten() });
    return;
  }
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) return;

  const linkSchema = z.object({
    exercises: z.array(z.object({
      exerciseId: z.coerce.number().int().positive(),
      orderIndex: z.coerce.number().int().min(0),
      marks: z.coerce.number().int().positive().optional()
    }))
  });

  const parsedBody = linkSchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({ error: "Invalid payload", details: parsedBody.error.flatten() });
    return;
  }

  for (const ex of parsedBody.data.exercises) {
    await pastPaperRepository.linkExercise(parsedParams.data.id, ex.exerciseId, ex.orderIndex, ex.marks);
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;
  await persistAuditLog({
    scope: "content",
    action: "Link exercises to past paper",
    target: `Past Paper #${parsedParams.data.id}`,
    status: "success",
    message: `Linked ${parsedBody.data.exercises.length} exercises`,
    actorId,
    actorName
  });

  res.status(200).json({ success: true, count: parsedBody.data.exercises.length });
});

// POST /api/admin/content/past-papers/:id/exercises/:exerciseId/remove
adminRouter.post("/content/past-papers/:id/exercises/:exerciseId/remove", requireSession, async (req, res) => {
  const paramsSchema = z.object({
    id: z.coerce.number().int().positive(),
    exerciseId: z.coerce.number().int().positive()
  });
  const parsed = paramsSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid parameters", details: parsed.error.flatten() });
    return;
  }
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) return;

  await pastPaperRepository.unlinkExercise(parsed.data.id, parsed.data.exerciseId);
  res.status(200).json({ success: true });
});

// POST /api/admin/content/past-papers/:id/publish
adminRouter.post("/content/past-papers/:id/publish", requireSession, async (req, res) => {
  const parsedParams = curriculumEntityParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({ error: "Invalid paper ID", details: parsedParams.error.flatten() });
    return;
  }
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) return;

  try {
    const published = await pastPaperRepository.togglePublish(parsedParams.data.id);

    await persistAuditLog({
      scope: "content",
      action: published ? "Publish past paper" : "Unpublish past paper",
      target: `Past Paper #${parsedParams.data.id}`,
      status: "success",
      message: published ? "Published" : "Unpublished",
      actorId: authedReq.session.user.id,
      actorName: authedReq.session.user.name
    });

    res.status(200).json({ data: { published } });
  } catch (err) {
    res.status(404).json({ error: "Past paper not found" });
  }
});

// ==================== DATABASE BACKUP & RESTORE ====================

const backupCreateBodySchema = z.object({
  label: z.string().trim().min(1).max(100).optional()
});

const backupRestoreParamsSchema = z.object({
  name: z.string().trim().min(1).max(255)
});

/**
 * GET /api/admin/backup - List available database backups
 */
adminRouter.get("/backup", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  try {
    const backups = await listBackups();
    res.status(200).json({ backups });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list backups";
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/admin/backup - Create a new database backup
 */
adminRouter.post("/backup", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedBody = backupCreateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid backup label",
      details: parsedBody.error.flatten()
    });
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;

  try {
    const backup = await createBackup(parsedBody.data.label);

    await persistAuditLog({
      scope: "settings",
      action: "Create database backup",
      target: backup.name,
      status: "success",
      message: `Created backup "${backup.name}" (${(backup.sizeBytes / 1024).toFixed(1)} KB)`,
      actorId,
      actorName
    });

    res.status(201).json({ backup });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create backup";

    await persistAuditLog({
      scope: "settings",
      action: "Create database backup",
      target: "Unknown",
      status: "failed",
      message,
      actorId,
      actorName
    });

    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/admin/backup/:name/restore - Restore database from a backup file
 */
adminRouter.post("/backup/:name/restore", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedParams = backupRestoreParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid backup name",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;
  const backupName = parsedParams.data.name;

  try {
    await restoreBackup(backupName);

    await persistAuditLog({
      scope: "settings",
      action: "Restore database backup",
      target: backupName,
      status: "success",
      message: `Restored database from backup "${backupName}"`,
      actorId,
      actorName
    });

    res.status(200).json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to restore backup";

    await persistAuditLog({
      scope: "settings",
      action: "Restore database backup",
      target: backupName,
      status: "failed",
      message,
      actorId,
      actorName
    });

    res.status(500).json({ error: message });
  }
});

/**
 * DELETE /api/admin/backup/:name - Delete a backup file
 */
adminRouter.delete("/backup/:name", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedParams = backupRestoreParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid backup name",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;
  const backupName = parsedParams.data.name;

  try {
    await deleteBackup(backupName);

    await persistAuditLog({
      scope: "settings",
      action: "Delete database backup",
      target: backupName,
      status: "success",
      message: `Deleted backup "${backupName}"`,
      actorId,
      actorName
    });

    res.status(200).json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete backup";

    await persistAuditLog({
      scope: "settings",
      action: "Delete database backup",
      target: backupName,
      status: "failed",
      message,
      actorId,
      actorName
    });

    res.status(500).json({ error: message });
  }
});

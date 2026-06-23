import { and, asc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { Router } from "express";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";

import { requireAdminRole } from "../../../lib/admin.js";
import { CacheKeys, cacheService } from "../../../lib/cache/cache.service.js";
import { listAdminChapterGraph } from "../../../lib/chapter-graph.js";
import { db } from "../../../lib/db/index.js";
import {
  boardClasses,
  boards,
  chapterSubparts,
  chapterSummaryLinks,
  chapterTitleAliases,
  chapters,
  revisionNotes,
  subjects
} from "../../../lib/db/schema.js";
import { requireSession, type AuthenticatedRequest } from "../../../lib/session.js";
import { extractWikiLinks, normalizeWikiLinkTarget } from "../../../lib/wiki-links.js";
import { escapeLikePattern } from "../../../lib/escape-like.js";
import { persistAuditLog } from "../shared.js";

export const chaptersAdminRouter = Router();

const chapterParamsSchema = z.object({
  id: z.coerce.number().int().positive()
});

const curriculumEntityParamsSchema = z.object({
  id: z.coerce.number().int().positive()
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

chaptersAdminRouter.post("/content/chapters", requireSession, async (req, res) => {
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

chaptersAdminRouter.post("/content/chapters/:id/update", requireSession, async (req, res) => {
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

chaptersAdminRouter.post("/content/chapters/:id/delete", requireSession, async (req, res) => {
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

chaptersAdminRouter.get("/content/chapters", requireSession, async (req, res) => {
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

chaptersAdminRouter.get("/content/chapters/graph", requireSession, async (req, res) => {
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

chaptersAdminRouter.get("/content/chapters/link-suggestions", requireSession, async (req, res) => {
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

chaptersAdminRouter.get("/content/chapters/:id/links", requireSession, async (req, res) => {
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

chaptersAdminRouter.get("/content/chapters/:id/summary", requireSession, async (req, res) => {
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

chaptersAdminRouter.get("/content/chapters/:id/subparts", requireSession, async (req, res) => {
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

chaptersAdminRouter.post("/content/chapters/:id/subparts", requireSession, async (req, res) => {
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

chaptersAdminRouter.post("/content/chapters/:id/subparts/reorder", requireSession, async (req, res) => {
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

chaptersAdminRouter.post("/content/chapters/:id/subparts/:subpartId", requireSession, async (req, res) => {
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

chaptersAdminRouter.post("/content/chapters/:id/subparts/:subpartId/delete", requireSession, async (req, res) => {
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

chaptersAdminRouter.post("/content/chapters/:id/summary", requireSession, async (req, res) => {
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

chaptersAdminRouter.get("/content/chapters/:id/revision-notes", requireSession, async (req, res) => {
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

chaptersAdminRouter.post("/content/chapters/:id/revision-notes", requireSession, async (req, res) => {
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

chaptersAdminRouter.post("/content/chapters/:id/rename", requireSession, async (req, res) => {
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

chaptersAdminRouter.post("/content/chapters/:id/publish", requireSession, async (req, res) => {
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

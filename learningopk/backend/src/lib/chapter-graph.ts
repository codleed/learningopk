import { and, asc, eq, inArray, isNull, isNotNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "./db/index.js";
import { chapterSubparts, chapterSummaryLinks, chapters, userProgress } from "./db/schema.js";

type AdminGraphNode = {
  id: number;
  title: string;
  isPublished: boolean;
};

type AdminGraphEdge = {
  sourceChapterId: number;
  targetChapterId: number | null;
  isResolved: boolean;
};

export const listAdminChapterGraph = async ({ query }: { query: string }) => {
  const sourceSubparts = alias(chapterSubparts, "source_subparts");
  const targetSubparts = alias(chapterSubparts, "target_subparts");

  const allNodes = await db
    .select({
      id: chapters.id,
      title: chapters.title,
      isPublished: chapters.isPublished,
    })
    .from(chapters)
    .orderBy(asc(chapters.title));

  const unresolvedEdgeCountRows = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(chapterSummaryLinks)
    .where(isNull(chapterSummaryLinks.targetSubpartId));
  const unresolvedEdgeCount = unresolvedEdgeCountRows[0]?.count ?? 0;

  const resolvedEdgeRows = await db
    .select({
      sourceChapterId: sourceSubparts.chapterId,
      targetChapterId: targetSubparts.chapterId,
      isResolved: chapterSummaryLinks.isResolved,
    })
    .from(chapterSummaryLinks)
    .innerJoin(sourceSubparts, eq(chapterSummaryLinks.sourceSubpartId, sourceSubparts.id))
    .innerJoin(targetSubparts, eq(chapterSummaryLinks.targetSubpartId, targetSubparts.id))
    .where(isNotNull(chapterSummaryLinks.targetSubpartId))
    .orderBy(asc(sourceSubparts.chapterId), asc(targetSubparts.chapterId));

  const resolvedEdges: AdminGraphEdge[] = [];
  const seenResolvedEdges = new Set<string>();
  for (const edge of resolvedEdgeRows) {
    const edgeKey = `${edge.sourceChapterId}-${edge.targetChapterId}`;
    if (seenResolvedEdges.has(edgeKey)) {
      continue;
    }
    seenResolvedEdges.add(edgeKey);
    resolvedEdges.push({
      sourceChapterId: edge.sourceChapterId,
      targetChapterId: edge.targetChapterId,
      isResolved: edge.isResolved,
    });
  }

  const loweredQuery = query.trim().toLowerCase();
  const filteredNodes = loweredQuery.length
    ? allNodes.filter((node) => node.title.toLowerCase().includes(loweredQuery))
    : allNodes;
  const nodeIds = new Set(filteredNodes.map((node) => node.id));

  const filteredEdges = resolvedEdges.filter((edge) => {
    const targetChapterId = edge.targetChapterId;
    if (!targetChapterId) {
      return false;
    }
    return nodeIds.has(edge.sourceChapterId) || nodeIds.has(targetChapterId);
  });

  const connectedNodeIds = new Set<number>();
  for (const edge of filteredEdges) {
    if (edge.targetChapterId) {
      connectedNodeIds.add(edge.sourceChapterId);
      connectedNodeIds.add(edge.targetChapterId);
    }
  }

  const nodes =
    loweredQuery.length > 0
      ? filteredNodes.filter(
          (node) => connectedNodeIds.has(node.id) || node.title.toLowerCase().includes(loweredQuery)
        )
      : filteredNodes;

  return {
    nodes,
    edges: filteredEdges,
    unresolvedEdgeCount,
  };
};

type SubjectGraphNode = {
  id: number;
  title: string;
  slug: string;
  chapterNumber: number;
  isPublished: boolean;
  visited: boolean;
  completed: boolean;
};

type SubjectGraphEdge = {
  sourceChapterId: number;
  targetChapterId: number | null;
  isResolved: boolean;
};

export const listSubjectChapterGraph = async ({
  subjectId,
  userId,
}: {
  subjectId: number;
  userId: string;
}): Promise<{ nodes: SubjectGraphNode[]; edges: SubjectGraphEdge[] }> => {
  const sourceSubparts = alias(chapterSubparts, "source_subparts");
  const targetSubparts = alias(chapterSubparts, "target_subparts");

  const nodeRows = await db
    .select({
      id: chapters.id,
      title: chapters.title,
      slug: chapters.slug,
      chapterNumber: chapters.chapterNumber,
      isPublished: chapters.isPublished,
      visitedAt: userProgress.visitedAt,
      flashcardsCompleted: userProgress.flashcardsCompleted,
      quizAttemptsCount: userProgress.quizAttemptsCount,
    })
    .from(chapters)
    .leftJoin(
      userProgress,
      and(eq(userProgress.chapterId, chapters.id), eq(userProgress.userId, userId))
    )
    .where(and(eq(chapters.subjectId, subjectId), eq(chapters.isPublished, true)))
    .orderBy(asc(chapters.chapterNumber), asc(chapters.id));

  const nodes = nodeRows.map<SubjectGraphNode>((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    chapterNumber: row.chapterNumber,
    isPublished: row.isPublished,
    visited: Boolean(row.visitedAt),
    completed: Boolean(row.flashcardsCompleted || (row.quizAttemptsCount ?? 0) > 0),
  }));

  if (nodes.length === 0) {
    return {
      nodes,
      edges: [],
    };
  }

  const scopedNodeIds = nodes.map((node) => node.id);
  const edgeRows = await db
    .select({
      sourceChapterId: sourceSubparts.chapterId,
      targetChapterId: targetSubparts.chapterId,
      isResolved: chapterSummaryLinks.isResolved,
    })
    .from(chapterSummaryLinks)
    .innerJoin(sourceSubparts, eq(chapterSummaryLinks.sourceSubpartId, sourceSubparts.id))
    .leftJoin(targetSubparts, eq(chapterSummaryLinks.targetSubpartId, targetSubparts.id))
    .where(
      and(
        inArray(sourceSubparts.chapterId, scopedNodeIds),
        or(isNull(targetSubparts.chapterId), inArray(targetSubparts.chapterId, scopedNodeIds))
      )
    )
    .orderBy(asc(sourceSubparts.chapterId), asc(targetSubparts.chapterId));

  const edges: SubjectGraphEdge[] = [];
  const seenEdges = new Set<string>();
  for (const edge of edgeRows) {
    const edgeKey = `${edge.sourceChapterId}-${edge.targetChapterId ?? "unresolved"}`;
    if (seenEdges.has(edgeKey)) {
      continue;
    }
    seenEdges.add(edgeKey);
    edges.push({
      sourceChapterId: edge.sourceChapterId,
      targetChapterId: edge.targetChapterId,
      isResolved: edge.isResolved,
    });
  }

  return {
    nodes,
    edges,
  };
};

export type { AdminGraphEdge, AdminGraphNode, SubjectGraphEdge, SubjectGraphNode };

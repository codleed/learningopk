import { asc, sql } from "drizzle-orm";
import { Router } from "express";
import { requireAdminRole } from "../../../lib/admin.js";
import { db } from "../../../lib/db/index.js";
import { boards, boardClasses, chapters, subjects } from "../../../lib/db/schema.js";
import { requireSession, type AuthenticatedRequest } from "../../../lib/session.js";

export const curriculumAdminRouter = Router();

curriculumAdminRouter.get("/content/curriculum", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const boardRows = await db
    .select({
      id: boards.id,
      name: boards.name,
      slug: boards.slug,
    })
    .from(boards)
    .orderBy(asc(boards.name));

  const classRows = await db
    .select({
      id: boardClasses.id,
      boardId: boardClasses.boardId,
      name: boardClasses.name,
      slug: boardClasses.slug,
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
      coverImageUrl: subjects.coverImageUrl,
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
      coverImageUrl: chapters.coverImageUrl,
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
          coverImageUrl: chapter.coverImageUrl,
        })),
      })),
    })),
  }));

  res.status(200).json({
    boards: tree,
  });
});

import { and, asc, desc, eq, sql } from "drizzle-orm";

import { db } from "../lib/db/index.js";
import { boards, chapters, examAnalysis, mockExams, quizQuestions, subjects } from "../lib/db/schema.js";

const ANALYSIS_WINDOW_YEARS = 5;

type SubjectRoute = {
  board: string;
  grade: string;
  subject: string;
};

type ChapterRoute = SubjectRoute & {
  chapter: string;
};

export class ExamPatternRepository {
  async refreshAnalysisForSubject(subjectId: number, boardId: number) {
    await db.delete(examAnalysis).where(and(eq(examAnalysis.subjectId, subjectId), eq(examAnalysis.boardId, boardId)));

    await db.execute(sql`
      insert into exam_analysis (board_id, subject_id, chapter_id, occurrence_count, avg_marks, last_seen_year)
      select
        ${boardId}::integer as board_id,
        ${subjectId}::integer as subject_id,
        qq.chapter_id as chapter_id,
        count(distinct me.year)::integer as occurrence_count,
        coalesce(round(avg(qq.marks)::numeric, 2), 0)::real as avg_marks,
        max(me.year)::integer as last_seen_year
      from mock_exams me
      inner join quiz_questions qq on qq.quiz_id = me.quiz_id
      where me.subject_id = ${subjectId}
        and me.board_id = ${boardId}
        and qq.chapter_id is not null
        and me.year >= (
          select coalesce(max(year), extract(year from now())::integer) - ${ANALYSIS_WINDOW_YEARS - 1}
          from mock_exams
          where subject_id = ${subjectId} and board_id = ${boardId}
        )
      group by qq.chapter_id
    `);
  }

  async findSubjectPatternsByRoute(params: SubjectRoute) {
    const contextRows = await db
      .select({
        boardId: boards.id,
        boardName: boards.name,
        boardSlug: boards.slug,
        subjectId: subjects.id,
        subjectName: subjects.name,
        subjectSlug: subjects.slug
      })
      .from(subjects)
      .innerJoin(boards, eq(subjects.boardId, boards.id))
      .where(
        and(
          eq(boards.slug, params.board),
          eq(subjects.slug, params.subject),
          sql`${subjects.grade}::text = ${params.grade} or exists (
            select 1 from board_classes bc where bc.id = ${subjects.boardClassId} and bc.slug = ${params.grade}
          )`
        )
      )
      .limit(1);

    const context = contextRows[0] ?? null;
    if (!context) {
      return null;
    }

    await this.refreshAnalysisForSubject(context.subjectId, context.boardId);

    const latestYearRows = await db
      .select({ latestYear: sql<number | null>`max(${mockExams.year})` })
      .from(mockExams)
      .where(and(eq(mockExams.subjectId, context.subjectId), eq(mockExams.boardId, context.boardId)));

    const latestYear = latestYearRows[0]?.latestYear ?? null;
    const startYear = latestYear === null ? null : latestYear - (ANALYSIS_WINDOW_YEARS - 1);
    const totalYears = latestYear === null || startYear === null ? 0 : latestYear - startYear + 1;

    const chapterRows = await db
      .select({
        chapterId: chapters.id,
        chapterNumber: chapters.chapterNumber,
        chapterTitle: chapters.title,
        chapterSlug: chapters.slug,
        occurrenceCount: sql<number>`coalesce(${examAnalysis.occurrenceCount}, 0)`,
        avgMarks: sql<number>`coalesce(${examAnalysis.avgMarks}, 0)`,
        lastSeenYear: examAnalysis.lastSeenYear
      })
      .from(chapters)
      .leftJoin(
        examAnalysis,
        and(
          eq(examAnalysis.chapterId, chapters.id),
          eq(examAnalysis.subjectId, context.subjectId),
          eq(examAnalysis.boardId, context.boardId)
        )
      )
      .where(eq(chapters.subjectId, context.subjectId))
      .orderBy(desc(sql`coalesce(${examAnalysis.occurrenceCount}, 0)`), desc(sql`coalesce(${examAnalysis.avgMarks}, 0)`), asc(chapters.chapterNumber));

    const trendRows = latestYear === null || startYear === null
      ? []
      : await db
          .select({
            chapterId: chapters.id,
            year: mockExams.year,
            marks: sql<number>`coalesce(sum(${quizQuestions.marks}), 0)`
          })
          .from(chapters)
          .leftJoin(quizQuestions, eq(quizQuestions.chapterId, chapters.id))
          .leftJoin(mockExams, eq(mockExams.quizId, quizQuestions.quizId))
          .where(
            and(
              eq(chapters.subjectId, context.subjectId),
              eq(mockExams.subjectId, context.subjectId),
              eq(mockExams.boardId, context.boardId),
              sql`${mockExams.year} >= ${startYear}`,
              sql`${mockExams.year} <= ${latestYear}`
            )
          )
          .groupBy(chapters.id, mockExams.year)
          .orderBy(asc(chapters.id), asc(mockExams.year));

    const trendMap = new Map<number, Map<number, number>>();
    for (const row of trendRows) {
      if (row.year === null) {
        continue;
      }
      const chapterTrend = trendMap.get(row.chapterId) ?? new Map<number, number>();
      chapterTrend.set(row.year, row.marks);
      trendMap.set(row.chapterId, chapterTrend);
    }

    const years = totalYears > 0 && startYear !== null
      ? Array.from({ length: totalYears }, (_, index) => startYear + index)
      : [];

    const weightedChapters = chapterRows.map((row) => {
      const percentage = totalYears > 0 ? Math.round((row.occurrenceCount / totalYears) * 100) : 0;
      return {
        id: row.chapterId,
        chapterNumber: row.chapterNumber,
        title: row.chapterTitle,
        slug: row.chapterSlug,
        occurrenceCount: row.occurrenceCount,
        avgMarks: Number(row.avgMarks ?? 0),
        lastSeenYear: row.lastSeenYear,
        weightagePercentage: percentage,
        trend: years.map((year) => ({ year, marks: trendMap.get(row.chapterId)?.get(year) ?? 0 }))
      };
    });

    const focusChapters = weightedChapters.slice(0, 3).filter((chapter) => chapter.weightagePercentage > 0);

    return {
      board: {
        id: context.boardId,
        name: context.boardName,
        slug: context.boardSlug
      },
      subject: {
        id: context.subjectId,
        name: context.subjectName,
        slug: context.subjectSlug
      },
      analysisWindowYears: totalYears,
      years,
      chapters: weightedChapters,
      recommendation: focusChapters.length > 0
        ? {
            focusPercent: 60,
            chapterCount: focusChapters.length,
            chapters: focusChapters.map((chapter) => chapter.title)
          }
        : null
    };
  }

  async findChapterPatternByRoute(params: ChapterRoute) {
    const subjectPatterns = await this.findSubjectPatternsByRoute(params);
    if (!subjectPatterns) {
      return null;
    }

    const chapterPattern = subjectPatterns.chapters.find((chapter) => chapter.slug === params.chapter) ?? null;
    if (!chapterPattern) {
      return null;
    }

    return {
      ...chapterPattern,
      analysisWindowYears: subjectPatterns.analysisWindowYears
    };
  }
}

export const examPatternRepository = new ExamPatternRepository();

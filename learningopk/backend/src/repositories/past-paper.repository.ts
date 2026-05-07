import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "../lib/db/index.js";
import {
  mockExams,
  pastPaperExercises,
  pastPaperAttempts,
  pastPaperAttemptAnswers,
  exercises,
  boards,
  subjects
} from "../lib/db/schema.js";

export const pastPaperRepository = {
  async listPublishedPapers(params: {
    grade: string;
    boardId: number;
    page?: number;
    limit?: number;
    search?: string;
    subjectId?: number;
    year?: number;
  }) {
    const { grade, boardId, page = 1, limit = 20, subjectId, year } = params;
    const offset = (page - 1) * limit;

    const conditions: ReturnType<typeof eq>[] = [
      eq(mockExams.published, true),
      eq(mockExams.grade, grade as "9" | "10"),
      eq(mockExams.boardId, boardId)
    ];
    if (subjectId) conditions.push(eq(mockExams.subjectId, subjectId));
    if (year) conditions.push(eq(mockExams.year, year));

    const whereClause = and(...conditions);

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(mockExams)
      .where(whereClause);

    const total = countResult[0]?.count ?? 0;

    const rows = await db
      .select({
        id: mockExams.id,
        title: mockExams.title,
        year: mockExams.year,
        durationMinutes: mockExams.durationMinutes,
        totalMarks: mockExams.totalMarks,
        boardId: mockExams.boardId,
        boardName: boards.name,
        boardSlug: boards.slug,
        grade: mockExams.grade,
        subjectId: mockExams.subjectId,
        subjectName: subjects.name,
        subjectSlug: subjects.slug,
        quizId: mockExams.quizId,
        paperContent: mockExams.paperContent,
        solutionContent: mockExams.solutionContent,
        published: mockExams.published,
        description: mockExams.description
      })
      .from(mockExams)
      .innerJoin(boards, eq(mockExams.boardId, boards.id))
      .innerJoin(subjects, eq(mockExams.subjectId, subjects.id))
      .where(whereClause)
      .orderBy(desc(mockExams.year))
      .limit(limit)
      .offset(offset);

    const paperIds = rows.map(r => r.id);
    const exerciseCounts = paperIds.length > 0
      ? await db
          .select({
            mockExamId: pastPaperExercises.mockExamId,
            count: sql<number>`count(*)`
          })
          .from(pastPaperExercises)
          .where(sql`${pastPaperExercises.mockExamId} = any(${paperIds})`)
          .groupBy(pastPaperExercises.mockExamId)
      : [];

    const countMap = new Map(exerciseCounts.map(c => [c.mockExamId, Number(c.count)]));

    return {
      papers: rows.map(r => ({
        ...r,
        exerciseCount: countMap.get(r.id) ?? 0
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  },

  async getPaperExercises(mockExamId: number) {
    return db
      .select({
        id: exercises.id,
        exerciseNumber: exercises.exerciseNumber,
        question: exercises.question,
        solution: exercises.solution,
        difficulty: exercises.difficulty,
        type: exercises.type,
        options: exercises.options,
        correctOption: exercises.correctOption,
        blanksAnswer: exercises.blanksAnswer,
        statements: exercises.statements,
        problemMarkdown: exercises.problemMarkdown,
        orderIndex: pastPaperExercises.orderIndex,
        marks: pastPaperExercises.marks
      })
      .from(pastPaperExercises)
      .innerJoin(exercises, eq(pastPaperExercises.exerciseId, exercises.id))
      .where(eq(pastPaperExercises.mockExamId, mockExamId))
      .orderBy(asc(pastPaperExercises.orderIndex));
  },

  async getActiveAttempt(userId: string, mockExamId: number) {
    const rows = await db
      .select()
      .from(pastPaperAttempts)
      .where(
        and(
          eq(pastPaperAttempts.userId, userId),
          eq(pastPaperAttempts.mockExamId, mockExamId),
          eq(pastPaperAttempts.status, "in_progress")
        )
      )
      .limit(1);
    return rows[0] ?? null;
  },

  async getAttemptWithAnswers(attemptId: string, userId: string) {
    const attemptRows = await db
      .select()
      .from(pastPaperAttempts)
      .where(
        and(
          eq(pastPaperAttempts.id, attemptId),
          eq(pastPaperAttempts.userId, userId)
        )
      )
      .limit(1);

    const attempt = attemptRows[0];
    if (!attempt) return null;

    const answerRows = await db
      .select()
      .from(pastPaperAttemptAnswers)
      .where(eq(pastPaperAttemptAnswers.attemptId, attemptId));

    const exerciseRows = await this.getPaperExercises(attempt.mockExamId);

    return { attempt, answers: answerRows, exercises: exerciseRows };
  },

  async getUserAttempts(userId: string, mockExamId: number) {
    return db
      .select()
      .from(pastPaperAttempts)
      .where(
        and(
          eq(pastPaperAttempts.userId, userId),
          eq(pastPaperAttempts.mockExamId, mockExamId)
        )
      )
      .orderBy(desc(pastPaperAttempts.startedAt));
  },

  async createAttempt(data: {
    userId: string;
    mockExamId: number;
    timeLimitSeconds: number;
    totalMarks: number;
  }) {
    const rows = await db
      .insert(pastPaperAttempts)
      .values({
        userId: data.userId,
        mockExamId: data.mockExamId,
        timeLimitSeconds: data.timeLimitSeconds,
        totalMarks: data.totalMarks,
        status: "in_progress"
      })
      .returning();
    return rows[0]!;
  },

  async upsertAnswer(data: {
    attemptId: string;
    exerciseId: number;
    answer: unknown;
  }) {
    await db
      .insert(pastPaperAttemptAnswers)
      .values({
        attemptId: data.attemptId,
        exerciseId: data.exerciseId,
        answer: data.answer
      })
      .onConflictDoUpdate({
        target: [pastPaperAttemptAnswers.attemptId, pastPaperAttemptAnswers.exerciseId],
        set: { answer: data.answer }
      });
  },

  async updateAnswerScore(data: {
    attemptId: string;
    exerciseId: number;
    score: number;
    aiFeedback?: string;
  }) {
    const updateData: Record<string, unknown> = { score: data.score };
    if (data.aiFeedback !== undefined) updateData.aiFeedback = data.aiFeedback;
    await db
      .update(pastPaperAttemptAnswers)
      .set(updateData)
      .where(
        and(
          eq(pastPaperAttemptAnswers.attemptId, data.attemptId),
          eq(pastPaperAttemptAnswers.exerciseId, data.exerciseId)
        )
      );
  },

  async claimAttempt(attemptId: string): Promise<boolean> {
    const result = await db
      .update(pastPaperAttempts)
      .set({ status: "submitted" })
      .where(
        and(
          eq(pastPaperAttempts.id, attemptId),
          eq(pastPaperAttempts.status, "in_progress")
        )
      )
      .returning({ id: pastPaperAttempts.id });
    return result.length > 0;
  },

  async finalizeAttempt(attemptId: string, data: {
    status: "submitted" | "timed_out";
    score: number;
    percentage: number;
  }) {
    await db
      .update(pastPaperAttempts)
      .set({
        status: data.status,
        score: data.score,
        percentage: data.percentage,
        submittedAt: new Date()
      })
      .where(eq(pastPaperAttempts.id, attemptId));
  },

  async getPaperById(mockExamId: number) {
    const rows = await db
      .select()
      .from(mockExams)
      .where(eq(mockExams.id, mockExamId))
      .limit(1);
    return rows[0] ?? null;
  },

  async listAdminPapers(params: {
    boardId?: number;
    grade?: string;
    subjectId?: number;
    year?: number;
  }) {
    const conditions: ReturnType<typeof eq>[] = [];
    if (params.boardId) conditions.push(eq(mockExams.boardId, params.boardId));
    if (params.grade) conditions.push(eq(mockExams.grade, params.grade as "9" | "10"));
    if (params.subjectId) conditions.push(eq(mockExams.subjectId, params.subjectId));
    if (params.year) conditions.push(eq(mockExams.year, params.year));

    return db
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
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(mockExams.year), asc(mockExams.title));
  },

  async linkExercise(mockExamId: number, exerciseId: number, orderIndex: number, marks?: number) {
    await db
      .insert(pastPaperExercises)
      .values({ mockExamId, exerciseId, orderIndex, marks: marks ?? null })
      .onConflictDoUpdate({
        target: [pastPaperExercises.mockExamId, pastPaperExercises.exerciseId],
        set: { orderIndex, marks: marks ?? null }
      });
  },

  async unlinkExercise(mockExamId: number, exerciseId: number) {
    await db
      .delete(pastPaperExercises)
      .where(
        and(
          eq(pastPaperExercises.mockExamId, mockExamId),
          eq(pastPaperExercises.exerciseId, exerciseId)
        )
      );
  },

  async togglePublish(mockExamId: number) {
    const paper = await this.getPaperById(mockExamId);
    if (!paper) throw new Error("Paper not found");
    const newPublished = !paper.published;
    await db
      .update(mockExams)
      .set({ published: newPublished })
      .where(eq(mockExams.id, mockExamId));
    return newPublished;
  }
};

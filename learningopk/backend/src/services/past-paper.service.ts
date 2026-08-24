import { pastPaperRepository } from "../repositories/past-paper.repository.js";
import type { GradableExercise } from "./past-paper-grading.service.js";
import { autoGradeExercises, calculateTotalScore } from "./past-paper-grading.service.js";
import { gradeWithAI } from "./past-paper-ai-grading.service.js";
import { xpService } from "./xp.service.js";
import { progressService } from "./progress.service.js";
import { db } from "../lib/db/index.js";
import { boards } from "../lib/db/schema.js";
import { eq } from "drizzle-orm";

export const pastPaperService = {
  async startAttempt(
    userId: string,
    mockExamId: number,
    userClass?: string,
    userBoardSlug?: string
  ) {
    const paper = await pastPaperRepository.getPaperById(mockExamId);
    if (!paper) throw new Error("PAST_PAPER_NOT_FOUND");
    if (!paper.published) throw new Error("PAST_PAPER_NOT_AVAILABLE");

    if (userClass !== undefined && userBoardSlug !== undefined) {
      if (paper.grade !== userClass) throw new Error("PAST_PAPER_NOT_AVAILABLE");
      const boardRows = await db
        .select({ id: boards.id })
        .from(boards)
        .where(eq(boards.slug, userBoardSlug))
        .limit(1);
      const board = boardRows[0];
      if (!board || paper.boardId !== board.id) throw new Error("PAST_PAPER_NOT_AVAILABLE");
    }

    const existing = await pastPaperRepository.getActiveAttempt(userId, mockExamId);
    if (existing) {
      const exercises = await pastPaperRepository.getPaperExercises(mockExamId);
      const data = await pastPaperRepository.getAttemptWithAnswers(existing.id, userId);
      const savedAnswers: Record<number, unknown> = {};
      for (const a of data?.answers ?? []) {
        savedAnswers[a.exerciseId] = a.answer;
      }
      return { attempt: existing, exercises, savedAnswers };
    }

    const exercises = await pastPaperRepository.getPaperExercises(mockExamId);
    if (exercises.length === 0) throw new Error("NO_EXERCISES_LINKED");

    const totalMarks = exercises.reduce((sum, e) => sum + (e.marks ?? 1), 0);
    const timeLimitSeconds = paper.durationMinutes * 60;

    const attempt = await pastPaperRepository.createAttempt({
      userId,
      mockExamId,
      timeLimitSeconds,
      totalMarks,
    });

    return { attempt, exercises, savedAnswers: {} as Record<number, unknown> };
  },

  async saveAnswer(
    userId: string,
    attemptId: string,
    exerciseId: number,
    answer: unknown,
    mockExamId?: number
  ) {
    const data = await pastPaperRepository.getAttemptWithAnswers(attemptId, userId);
    if (!data) throw new Error("ATTEMPT_NOT_FOUND");
    if (data.attempt.status !== "in_progress") throw new Error("ATTEMPT_ALREADY_COMPLETED");
    if (mockExamId !== undefined && data.attempt.mockExamId !== mockExamId)
      throw new Error("ATTEMPT_NOT_FOUND");

    await pastPaperRepository.upsertAnswer({ attemptId, exerciseId, answer });
  },

  async submitAttempt(
    userId: string,
    attemptId: string,
    status: "submitted" | "timed_out" = "submitted",
    mockExamId?: number
  ) {
    const data = await pastPaperRepository.getAttemptWithAnswers(attemptId, userId);
    if (!data) throw new Error("ATTEMPT_NOT_FOUND");
    if (data.attempt.status !== "in_progress") throw new Error("ATTEMPT_ALREADY_COMPLETED");
    if (mockExamId !== undefined && data.attempt.mockExamId !== mockExamId)
      throw new Error("ATTEMPT_NOT_FOUND");

    // Atomically claim the attempt to prevent concurrent processing
    const claimed = await pastPaperRepository.claimAttempt(attemptId);
    if (!claimed) throw new Error("ATTEMPT_ALREADY_COMPLETED");

    const answersMap: Record<number, unknown> = {};
    for (const a of data.answers) {
      answersMap[a.exerciseId] = a.answer;
    }

    const graded = autoGradeExercises(
      data.exercises.map((e) => ({
        id: e.id,
        type: e.type as GradableExercise["type"],
        options: e.options as GradableExercise["options"],
        correctOption: e.correctOption,
        blanksAnswer: e.blanksAnswer,
        statements: e.statements as GradableExercise["statements"],
        marks: e.marks,
        solution: e.solution ?? undefined,
      })),
      answersMap
    );

    // Collect exercises needing AI grading
    const aiRequests = graded
      .filter((q) => q.needsAiGrading)
      .map((q) => {
        const exercise = data.exercises.find((e) => e.id === q.exerciseId);
        return {
          exerciseId: q.exerciseId,
          question: exercise?.question ?? "",
          studentAnswer: String(answersMap[q.exerciseId] ?? ""),
          modelSolution: exercise?.solution ?? "",
          maxMarks: q.maxMarks,
        };
      });

    if (aiRequests.length > 0) {
      const aiResults = await gradeWithAI(aiRequests);
      for (const aiResult of aiResults) {
        const q = graded.find((g) => g.exerciseId === aiResult.exerciseId);
        if (q) {
          q.score = aiResult.score;
          q.aiFeedback = aiResult.feedback;
          await pastPaperRepository.updateAnswerScore({
            attemptId,
            exerciseId: aiResult.exerciseId,
            score: aiResult.score,
            aiFeedback: aiResult.feedback,
          });
        }
      }
    }

    // Save auto-graded scores
    for (const q of graded) {
      if (!q.needsAiGrading) {
        await pastPaperRepository.updateAnswerScore({
          attemptId,
          exerciseId: q.exerciseId,
          score: q.score,
        });
      }
    }

    const { totalScore, totalMarks, percentage } = calculateTotalScore(graded);

    // Award XP proportional to percentage
    const xpToAward = Math.round(
      (percentage / 100) * (totalMarks > 0 ? Math.min(totalMarks, 100) : 50)
    );
    await xpService.awardXp(userId, xpToAward, "past_paper_attempt");

    // Record progress event
    await progressService.recordPastPaperAttempt(userId, data.attempt.mockExamId, percentage);

    await pastPaperRepository.finalizeAttempt(attemptId, {
      status,
      score: totalScore,
      percentage,
    });

    return {
      attemptId,
      totalScore,
      totalMarks,
      percentage,
      gradedQuestions: graded.map((q) => ({
        ...q,
        userAnswer: answersMap[q.exerciseId],
      })),
      xpAwarded: xpToAward,
    };
  },
};

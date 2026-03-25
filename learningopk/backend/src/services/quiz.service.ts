import { eq } from "drizzle-orm";

import { db } from "../lib/db/index.js";
import { quizAttempts, quizQuestions, quizzes } from "../lib/db/schema.js";
import type { QuizOption, QuizQuestionForScoring } from "../lib/quiz-scoring.js";
import { getInvalidAnswerQuestionIds, scoreQuizSubmission } from "../lib/quiz-scoring.js";
import { applyProgressEvent } from "../lib/progress.js";

export interface QuizQuestionRow {
  id: number;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: QuizOption;
  explanation: string | null;
  marks: number;
}

export interface QuizSubmissionInput {
  quizId: number;
  answers: Record<string, "a" | "b" | "c" | "d">;
  startedAt?: string | undefined;
  userId: string;
}

export interface QuizSubmissionResult {
  attemptId: string;
  quizId: number;
  quizType: string;
  score: number;
  totalMarks: number;
  percentage: number;
  timeSpentSeconds: number;
  completedAt: string;
  questionResults: Array<{
    questionId: number;
    selectedOption: "a" | "b" | "c" | "d" | null;
    correctOption: "a" | "b" | "c" | "d";
    isCorrect: boolean;
    marks: number;
    explanation: string | null;
  }>;
}

export class QuizService {
  async getQuizById(quizId: number) {
    const quizRows = await db
      .select({
        id: quizzes.id,
        chapterId: quizzes.chapterId,
        totalMarks: quizzes.totalMarks,
        type: quizzes.type
      })
      .from(quizzes)
      .where(eq(quizzes.id, quizId))
      .limit(1);

    return quizRows[0] ?? null;
  }

  async getQuizQuestions(quizId: number): Promise<QuizQuestionRow[]> {
    return db
      .select({
        id: quizQuestions.id,
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
      .where(eq(quizQuestions.quizId, quizId));
  }

  async submitQuiz(input: QuizSubmissionInput): Promise<QuizSubmissionResult> {
    const { quizId, answers, startedAt, userId } = input;

    const quizRow = await this.getQuizById(quizId);
    if (!quizRow) {
      throw new Error("Quiz not found");
    }

    const questionRows = await this.getQuizQuestions(quizId);
    if (questionRows.length === 0) {
      throw new Error("Quiz has no questions to score");
    }

    const invalidAnswerQuestionIds = getInvalidAnswerQuestionIds(questionRows, answers);
    if (invalidAnswerQuestionIds.length > 0) {
      throw new Error("Answers include question IDs that do not belong to this quiz");
    }

    const { questionResults, score, totalMarks, percentage } = scoreQuizSubmission({
      questionRows,
      answers,
      configuredTotalMarks: quizRow.totalMarks
    });

    const completedAt = new Date();
    const startedAtDate = startedAt ? new Date(startedAt) : completedAt;
    const normalizedStartedAt = !Number.isNaN(startedAtDate.getTime()) && startedAtDate <= completedAt ? startedAtDate : completedAt;

    const insertedAttemptRows = await db
      .insert(quizAttempts)
      .values({
        userId,
        quizId,
        answers,
        score,
        totalMarks,
        startedAt: normalizedStartedAt,
        completedAt
      })
      .returning({
        id: quizAttempts.id,
        completedAt: quizAttempts.completedAt
      });

    const insertedAttempt = insertedAttemptRows[0];
    if (!insertedAttempt) {
      throw new Error("Could not save quiz attempt");
    }

    await applyProgressEvent({
      eventType: "quiz_submit",
      userId,
      chapterId: quizRow.chapterId,
      score,
      occurredAt: completedAt
    });

    const timeSpentSeconds = Math.max(0, Math.floor((completedAt.getTime() - normalizedStartedAt.getTime()) / 1000));

    return {
      attemptId: insertedAttempt.id,
      quizId,
      quizType: quizRow.type,
      score,
      totalMarks,
      percentage,
      timeSpentSeconds,
      completedAt: insertedAttempt.completedAt.toISOString(),
      questionResults
    };
  }
}

export const quizService = new QuizService();

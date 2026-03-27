import { quizRepository } from "../repositories/quiz.repository.js";
import type { QuizOption } from "../lib/quiz-scoring.js";
import { getInvalidAnswerQuestionIds, scoreQuizSubmission } from "../lib/quiz-scoring.js";
import { applyProgressEvent } from "../lib/progress.js";
import { xpService } from "./xp.service.js";

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
  passed: boolean;
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
  xp: {
    xpAwarded: number;
    newXp: number;
    level: number;
    levelName: string;
    leveledUp: boolean;
  } | null;
  xpFailed?: boolean;
}

export class QuizService {
  async getQuizById(quizId: number) {
    const quizRows = await quizRepository.findQuizById(quizId);
    return quizRows[0] ?? null;
  }

  async getQuizQuestions(quizId: number): Promise<QuizQuestionRow[]> {
    return quizRepository.findQuestionsByQuizId(quizId);
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

    const insertedAttemptRows = await quizRepository.createAttempt({
      userId,
      quizId,
      answers,
      score,
      totalMarks,
      startedAt: normalizedStartedAt,
      completedAt
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

    // Award XP if passed (70%+)
    let xpResult: {
      xpAwarded: number;
      newXp: number;
      level: number;
      levelName: string;
      leveledUp: boolean;
    } | null = null;
    let xpFailed = false;
    const passed = percentage >= 70;
    if (passed) {
      try {
        const xpAwardResult = await xpService.awardQuizPassXp(userId, score, totalMarks);
        if (xpAwardResult) {
          xpResult = {
            xpAwarded: xpAwardResult.xpAwarded,
            newXp: xpAwardResult.newXp,
            level: xpAwardResult.level,
            levelName: xpAwardResult.levelName,
            leveledUp: xpAwardResult.leveledUp
          };
        }
      } catch (error) {
        console.error("Failed to award XP for quiz:", error);
        xpFailed = true;
      }
    }

    return {
      attemptId: insertedAttempt.id,
      quizId,
      quizType: quizRow.type,
      score,
      totalMarks,
      percentage,
      passed,
      timeSpentSeconds,
      completedAt: insertedAttempt.completedAt.toISOString(),
      questionResults,
      xp: xpResult,
      xpFailed
    };
  }
}

export const quizService = new QuizService();

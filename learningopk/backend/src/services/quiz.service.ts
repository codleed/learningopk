import { quizRepository } from "../repositories/quiz.repository.js";
import type { QuizOption } from "../lib/quiz-scoring.js";
import { getInvalidAnswerQuestionIds, scoreQuizSubmission } from "../lib/quiz-scoring.js";
import { applyProgressEvent } from "../lib/progress.js";
import { xpService } from "./xp.service.js";
import { QUIZ_PASS_THRESHOLD_PERCENT } from "../lib/constants.js";
import { aiContextRepository } from "../repositories/ai-context.repository.js";
import {
  QuizNotFoundError,
  QuizNoQuestionsError,
  QuizAnswerMismatchError,
  QuizAttemptSaveError
} from "../lib/errors/index.js";

export interface QuizQuestionRow {
  id: number;
  quizId: number;
  chapterId: number | null;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: QuizOption;
  explanation: string | null;
  marks: number;
  chapterTitle: string | null;
  chapterNumber: number | null;
}

export interface QuizSubmissionInput {
  quizId: number;
  answers: Record<string, "a" | "b" | "c" | "d">;
  startedAt?: string | undefined;
  userId: string;
}

export interface SectionScore {
  chapterId: number | null;
  chapterTitle: string | null;
  chapterNumber: number | null;
  score: number;
  totalMarks: number;
  questionCount: number;
  correctCount: number;
}

export interface WeakArea {
  chapterId: number;
  chapterTitle: string;
  chapterNumber: number;
  correctPercentage: number;
  wrongQuestionCount: number;
  totalQuestions: number;
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
    question: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    chapterId: number | null;
    chapterTitle: string | null;
    selectedOption: "a" | "b" | "c" | "d" | null;
    correctOption: "a" | "b" | "c" | "d";
    isCorrect: boolean;
    marks: number;
    awardedMarks: number;
    explanation: string | null;
  }>;
  sectionScores: SectionScore[];
  weakAreas: WeakArea[];
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
      throw new QuizNotFoundError();
    }

    const questionRows = await this.getQuizQuestions(quizId);
    if (questionRows.length === 0) {
      throw new QuizNoQuestionsError();
    }

    const invalidAnswerQuestionIds = getInvalidAnswerQuestionIds(questionRows, answers);
    if (invalidAnswerQuestionIds.length > 0) {
      throw new QuizAnswerMismatchError();
    }

    const { questionResults, score, totalMarks, percentage } = scoreQuizSubmission({
      questionRows,
      answers,
      configuredTotalMarks: quizRow.totalMarks
    });

    // Build question results with chapter information
    const questionResultsWithChapters = questionResults.map((qr) => {
      const questionRow = questionRows.find((q) => q.id === qr.questionId);
      return {
        questionId: qr.questionId,
        question: qr.question,
        optionA: qr.optionA,
        optionB: qr.optionB,
        optionC: qr.optionC,
        optionD: qr.optionD,
        chapterId: questionRow?.chapterId ?? null,
        chapterTitle: questionRow?.chapterTitle ?? null,
        selectedOption: qr.selectedOption,
        correctOption: qr.correctOption,
        isCorrect: qr.isCorrect,
        marks: qr.marks,
        awardedMarks: qr.awardedMarks,
        explanation: qr.explanation
      };
    });

    // Calculate section-wise scores (by chapter)
    const sectionMap = new Map<number | null, SectionScore>();
    
    for (const questionRow of questionRows) {
      const chapterId = questionRow.chapterId ?? null;
      if (!sectionMap.has(chapterId)) {
        sectionMap.set(chapterId, {
          chapterId,
          chapterTitle: questionRow.chapterTitle ?? (chapterId ? "Unknown Chapter" : "General"),
          chapterNumber: questionRow.chapterNumber ?? null,
          score: 0,
          totalMarks: 0,
          questionCount: 0,
          correctCount: 0
        });
      }
      
      const section = sectionMap.get(chapterId)!;
      section.totalMarks += questionRow.marks;
      section.questionCount += 1;
      
      const result = questionResults.find((r) => r.questionId === questionRow.id);
      if (result) {
        if (result.isCorrect) {
          section.score += result.marks;
          section.correctCount += 1;
        }
      }
    }

    const sectionScores = Array.from(sectionMap.values()).sort((a, b) => {
      if (a.chapterNumber === null) return 1;
      if (b.chapterNumber === null) return -1;
      return a.chapterNumber - b.chapterNumber;
    });

    // Identify weak areas (chapters with < pass threshold correct)
    const weakAreas: WeakArea[] = [];
    for (const section of sectionScores) {
      if (section.questionCount > 0 && section.chapterId !== null) {
        const correctPercentage = (section.correctCount / section.questionCount) * 100;
        if (correctPercentage < QUIZ_PASS_THRESHOLD_PERCENT) {
          weakAreas.push({
            chapterId: section.chapterId,
            chapterTitle: section.chapterTitle ?? "Unknown Chapter",
            chapterNumber: section.chapterNumber ?? 0,
            correctPercentage,
            wrongQuestionCount: section.questionCount - section.correctCount,
            totalQuestions: section.questionCount
          });
        }
      }
    }

    const completedAt = new Date();
    const startedAtDate = startedAt ? new Date(startedAt) : completedAt;
    const normalizedStartedAt = !Number.isNaN(startedAtDate.getTime()) && startedAtDate <= completedAt ? startedAtDate : completedAt;

    const insertedAttemptRows = await quizRepository.createAttempt({
      userId,
      quizId,
      type: quizRow.type,
      answers,
      score,
      totalMarks,
      startedAt: normalizedStartedAt,
      completedAt
    });

    const insertedAttempt = insertedAttemptRows[0];
    if (!insertedAttempt) {
      throw new QuizAttemptSaveError();
    }

    await applyProgressEvent({
      eventType: "quiz_submit",
      userId,
      chapterId: quizRow.chapterId,
      score,
      occurredAt: completedAt
    });

    const timeSpentSeconds = Math.max(0, Math.floor((completedAt.getTime() - normalizedStartedAt.getTime()) / 1000));

    // Award XP if passed (pass threshold+)
    let xpResult: {
      xpAwarded: number;
      newXp: number;
      level: number;
      levelName: string;
      leveledUp: boolean;
    } | null = null;
    let xpFailed = false;
    const passed = percentage >= QUIZ_PASS_THRESHOLD_PERCENT;
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

    // Quiz failure hook — add weak topics to AI context for low-scoring chapters
    // This runs async and does not block the response
    if (percentage < 50 && weakAreas.length > 0) {
      try {
        for (const area of weakAreas) {
          await aiContextRepository.addWeakTopic(userId, area.chapterTitle);
        }
      } catch (error) {
        console.error("Failed to update AI context with quiz weak areas:", error);
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
      questionResults: questionResultsWithChapters,
      sectionScores,
      weakAreas,
      xp: xpResult,
      xpFailed
    };
  }
}

export const quizService = new QuizService();

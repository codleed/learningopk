import { eq } from "drizzle-orm";

import { db } from "../lib/db/index.js";
import { quizAttempts, quizQuestions, quizzes } from "../lib/db/schema.js";

export class QuizRepository {
  async findQuizById(quizId: number) {
    return db
      .select({
        id: quizzes.id,
        chapterId: quizzes.chapterId,
        totalMarks: quizzes.totalMarks,
        type: quizzes.type
      })
      .from(quizzes)
      .where(eq(quizzes.id, quizId))
      .limit(1);
  }

  async findQuestionsByQuizId(quizId: number) {
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

  async createAttempt(data: {
    userId: string;
    quizId: number;
    answers: Record<string, "a" | "b" | "c" | "d">;
    score: number;
    totalMarks: number;
    startedAt: Date;
    completedAt: Date;
  }) {
    return db
      .insert(quizAttempts)
      .values(data)
      .returning({
        id: quizAttempts.id,
        completedAt: quizAttempts.completedAt
      });
  }

  async findAttemptsByUserId(userId: string, limit = 20) {
    return db
      .select()
      .from(quizAttempts)
      .where(eq(quizAttempts.userId, userId))
      .orderBy(quizAttempts.completedAt)
      .limit(limit);
  }
}

export const quizRepository = new QuizRepository();

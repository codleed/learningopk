import { alias } from "drizzle-orm/pg-core";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "../lib/db/index.js";
import {
  chapters,
  quizAttempts,
  quizDuelChallenges,
  quizQuestions,
  quizzes,
  users,
} from "../lib/db/schema.js";

export class QuizRepository {
  async findQuizById(quizId: number) {
    return db
      .select({
        id: quizzes.id,
        chapterId: quizzes.chapterId,
        totalMarks: quizzes.totalMarks,
        type: quizzes.type,
      })
      .from(quizzes)
      .where(eq(quizzes.id, quizId))
      .limit(1);
  }

  async findQuestionsByQuizId(quizId: number) {
    return db
      .select({
        id: quizQuestions.id,
        quizId: quizQuestions.quizId,
        chapterId: quizQuestions.chapterId,
        question: quizQuestions.question,
        optionA: quizQuestions.optionA,
        optionB: quizQuestions.optionB,
        optionC: quizQuestions.optionC,
        optionD: quizQuestions.optionD,
        correctOption: quizQuestions.correctOption,
        explanation: quizQuestions.explanation,
        marks: quizQuestions.marks,
        chapterTitle: chapters.title,
        chapterNumber: chapters.chapterNumber,
      })
      .from(quizQuestions)
      .leftJoin(chapters, eq(quizQuestions.chapterId, chapters.id))
      .where(eq(quizQuestions.quizId, quizId));
  }

  async createAttempt(data: {
    userId: string;
    quizId: number;
    type: "chapter_quiz" | "mock_exam";
    answers: Record<string, "a" | "b" | "c" | "d">;
    score: number;
    totalMarks: number;
    startedAt: Date;
    completedAt: Date;
  }) {
    return db.insert(quizAttempts).values(data).returning({
      id: quizAttempts.id,
      completedAt: quizAttempts.completedAt,
      score: quizAttempts.score,
      totalMarks: quizAttempts.totalMarks,
    });
  }

  async createDuelChallenge(data: {
    quizId: number;
    challengerUserId: string;
    challengerAttemptId: string;
    expiresAt: Date;
  }) {
    return db.insert(quizDuelChallenges).values(data).returning({
      id: quizDuelChallenges.id,
      quizId: quizDuelChallenges.quizId,
      expiresAt: quizDuelChallenges.expiresAt,
      createdAt: quizDuelChallenges.createdAt,
    });
  }

  async findAttemptById(attemptId: string) {
    return db
      .select({
        id: quizAttempts.id,
        userId: quizAttempts.userId,
        quizId: quizAttempts.quizId,
        score: quizAttempts.score,
        totalMarks: quizAttempts.totalMarks,
        completedAt: quizAttempts.completedAt,
      })
      .from(quizAttempts)
      .where(eq(quizAttempts.id, attemptId))
      .limit(1);
  }

  async findDuelChallengeById(challengeId: string) {
    const challengerAttempt = alias(quizAttempts, "challenger_attempt");
    const recipientAttempt = alias(quizAttempts, "recipient_attempt");
    const challengerUser = alias(users, "challenger_user");
    const recipientUser = alias(users, "recipient_user");

    return db
      .select({
        id: quizDuelChallenges.id,
        quizId: quizDuelChallenges.quizId,
        challengerUserId: quizDuelChallenges.challengerUserId,
        challengerAttemptId: quizDuelChallenges.challengerAttemptId,
        recipientUserId: quizDuelChallenges.recipientUserId,
        recipientAttemptId: quizDuelChallenges.recipientAttemptId,
        expiresAt: quizDuelChallenges.expiresAt,
        createdAt: quizDuelChallenges.createdAt,
        challengerName: challengerUser.name,
        recipientName: recipientUser.name,
        challengerScore: challengerAttempt.score,
        challengerTotalMarks: challengerAttempt.totalMarks,
        challengerCompletedAt: challengerAttempt.completedAt,
        recipientScore: recipientAttempt.score,
        recipientTotalMarks: recipientAttempt.totalMarks,
        recipientCompletedAt: recipientAttempt.completedAt,
      })
      .from(quizDuelChallenges)
      .innerJoin(
        challengerAttempt,
        eq(quizDuelChallenges.challengerAttemptId, challengerAttempt.id)
      )
      .innerJoin(challengerUser, eq(quizDuelChallenges.challengerUserId, challengerUser.id))
      .leftJoin(recipientAttempt, eq(quizDuelChallenges.recipientAttemptId, recipientAttempt.id))
      .leftJoin(recipientUser, eq(quizDuelChallenges.recipientUserId, recipientUser.id))
      .where(eq(quizDuelChallenges.id, challengeId))
      .limit(1);
  }

  async attachRecipientToDuelChallenge(data: {
    challengeId: string;
    recipientUserId: string;
    recipientAttemptId: string;
  }) {
    return db
      .update(quizDuelChallenges)
      .set({
        recipientUserId: data.recipientUserId,
        recipientAttemptId: data.recipientAttemptId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(quizDuelChallenges.id, data.challengeId),
          isNull(quizDuelChallenges.recipientAttemptId)
        )
      )
      .returning({
        id: quizDuelChallenges.id,
        recipientAttemptId: quizDuelChallenges.recipientAttemptId,
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

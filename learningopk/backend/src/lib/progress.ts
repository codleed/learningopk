import { and, eq } from "drizzle-orm";

import { db } from "./db/index.js";
import { userProgress } from "./db/schema.js";

type ProgressEventBase = {
  userId: string;
  chapterId: number;
  occurredAt?: Date;
};

export type ChapterVisitEvent = ProgressEventBase & {
  eventType: "chapter_visit";
};

export type ExerciseViewEvent = ProgressEventBase & {
  eventType: "exercise_view";
};

export type FlashcardCompleteEvent = ProgressEventBase & {
  eventType: "flashcard_complete";
};

export type QuizSubmitEvent = ProgressEventBase & {
  eventType: "quiz_submit";
  score: number;
};

export type ProgressEventInput = ChapterVisitEvent | ExerciseViewEvent | FlashcardCompleteEvent | QuizSubmitEvent;

export type ProgressSnapshot = {
  id: number;
  userId: string;
  chapterId: number;
  visitedAt: Date;
  exercisesViewed: number;
  flashcardsCompleted: boolean;
  quizBestScore: number;
  quizAttemptsCount: number;
};

const selectProgressById = async (id: number): Promise<ProgressSnapshot | null> => {
  const rows = await db
    .select({
      id: userProgress.id,
      userId: userProgress.userId,
      chapterId: userProgress.chapterId,
      visitedAt: userProgress.visitedAt,
      exercisesViewed: userProgress.exercisesViewed,
      flashcardsCompleted: userProgress.flashcardsCompleted,
      quizBestScore: userProgress.quizBestScore,
      quizAttemptsCount: userProgress.quizAttemptsCount
    })
    .from(userProgress)
    .where(eq(userProgress.id, id))
    .limit(1);

  return rows[0] ?? null;
};

export const applyProgressEvent = async (input: ProgressEventInput): Promise<ProgressSnapshot> => {
  const occurredAt = input.occurredAt ?? new Date();

  const existingRows = await db
    .select({
      id: userProgress.id,
      quizBestScore: userProgress.quizBestScore,
      quizAttemptsCount: userProgress.quizAttemptsCount,
      exercisesViewed: userProgress.exercisesViewed
    })
    .from(userProgress)
    .where(and(eq(userProgress.userId, input.userId), eq(userProgress.chapterId, input.chapterId)))
    .limit(1);

  const existing = existingRows[0];

  if (!existing) {
    const insertedRows = await db
      .insert(userProgress)
      .values({
        userId: input.userId,
        chapterId: input.chapterId,
        visitedAt: occurredAt,
        exercisesViewed: input.eventType === "exercise_view" ? 1 : 0,
        flashcardsCompleted: input.eventType === "flashcard_complete",
        quizBestScore: input.eventType === "quiz_submit" ? input.score : 0,
        quizAttemptsCount: input.eventType === "quiz_submit" ? 1 : 0
      })
      .returning({
        id: userProgress.id
      });

    const inserted = insertedRows[0];
    if (!inserted) {
      throw new Error("Could not insert user progress.");
    }

    const snapshot = await selectProgressById(inserted.id);
    if (!snapshot) {
      throw new Error("Could not fetch inserted user progress.");
    }

    return snapshot;
  }

  if (input.eventType === "chapter_visit") {
    await db
      .update(userProgress)
      .set({
        visitedAt: occurredAt
      })
      .where(eq(userProgress.id, existing.id));
  } else if (input.eventType === "exercise_view") {
    await db
      .update(userProgress)
      .set({
        visitedAt: occurredAt,
        exercisesViewed: existing.exercisesViewed + 1
      })
      .where(eq(userProgress.id, existing.id));
  } else if (input.eventType === "flashcard_complete") {
    await db
      .update(userProgress)
      .set({
        visitedAt: occurredAt,
        flashcardsCompleted: true
      })
      .where(eq(userProgress.id, existing.id));
  } else {
    await db
      .update(userProgress)
      .set({
        visitedAt: occurredAt,
        quizBestScore: Math.max(existing.quizBestScore, input.score),
        quizAttemptsCount: existing.quizAttemptsCount + 1
      })
      .where(eq(userProgress.id, existing.id));
  }

  const snapshot = await selectProgressById(existing.id);
  if (!snapshot) {
    throw new Error("Could not fetch updated user progress.");
  }

  return snapshot;
};

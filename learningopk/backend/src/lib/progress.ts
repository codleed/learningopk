import { and, eq, sql } from "drizzle-orm";

import { db } from "./db/index.js";
import {
  chapterSubparts,
  userActivityLog,
  userProgress,
  userProgressSubparts,
} from "./db/schema.js";
import { isMissingOptionalDbFeatureError } from "./db-schema-compat.js";
import { studyGroupsService } from "../services/study-groups.service.js";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

type ProgressEventBase = {
  userId: string;
  chapterId: number;
  occurredAt?: Date;
};

export type ChapterVisitEvent = ProgressEventBase & {
  eventType: "chapter_visit";
};

export type SummaryReadEvent = ProgressEventBase & {
  eventType: "summary_read";
};

export type SubpartReadEvent = ProgressEventBase & {
  eventType: "subpart_read";
  subpartId: number;
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

export type PastPaperAttemptEvent = {
  eventType: "past_paper_attempt";
  userId: string;
  chapterId: number;
  score: number;
  occurredAt?: Date;
};

export type ProgressEventInput =
  | ChapterVisitEvent
  | SummaryReadEvent
  | SubpartReadEvent
  | ExerciseViewEvent
  | FlashcardCompleteEvent
  | QuizSubmitEvent
  | PastPaperAttemptEvent;

export type ProgressSnapshot = {
  id: number;
  userId: string;
  chapterId: number;
  visitedAt: Date;
  summaryRead: boolean;
  subpartsReadCount: number;
  exercisesViewed: number;
  flashcardsCompleted: boolean;
  quizBestScore: number;
  quizAttemptsCount: number;
  isNewRead?: boolean;
};

const selectProgressById = async (id: number): Promise<ProgressSnapshot | null> => {
  const rows = await db
    .select({
      id: userProgress.id,
      userId: userProgress.userId,
      chapterId: userProgress.chapterId,
      visitedAt: userProgress.visitedAt,
      summaryRead: userProgress.summaryRead,
      subpartsReadCount: userProgress.subpartsReadCount,
      exercisesViewed: userProgress.exercisesViewed,
      flashcardsCompleted: userProgress.flashcardsCompleted,
      quizBestScore: userProgress.quizBestScore,
      quizAttemptsCount: userProgress.quizAttemptsCount,
    })
    .from(userProgress)
    .where(eq(userProgress.id, id))
    .limit(1);

  return rows[0] ?? null;
};

const logActivityEvent = async (
  userId: string,
  eventType: ProgressEventInput["eventType"],
  chapterId: number,
  occurredAt: Date
): Promise<void> => {
  try {
    await db.insert(userActivityLog).values({ userId, eventType, chapterId, occurredAt });
  } catch (error) {
    if (!isMissingOptionalDbFeatureError(error)) {
      throw error;
    }
  }
};

export const applyProgressEvent = async (input: ProgressEventInput): Promise<ProgressSnapshot> => {
  const occurredAt = input.occurredAt ?? new Date();

  const existingRows = await db
    .select({
      id: userProgress.id,
      quizBestScore: userProgress.quizBestScore,
      quizAttemptsCount: userProgress.quizAttemptsCount,
      exercisesViewed: userProgress.exercisesViewed,
      subpartsReadCount: userProgress.subpartsReadCount,
    })
    .from(userProgress)
    .where(and(eq(userProgress.userId, input.userId), eq(userProgress.chapterId, input.chapterId)))
    .limit(1);

  const existing = existingRows[0];

  const computeSummaryRead = async ({
    chapterId,
    userId,
    tx,
  }: {
    chapterId: number;
    userId: string;
    tx: DbTransaction;
  }): Promise<{ summaryRead: boolean; subpartsReadCount: number }> => {
    const totalSubpartsRows = await tx
      .select({
        count: chapterSubparts.id,
      })
      .from(chapterSubparts)
      .where(eq(chapterSubparts.chapterId, chapterId));
    const totalSubparts = totalSubpartsRows.length;

    const readSubpartsRows = await tx
      .select({
        subpartId: userProgressSubparts.subpartId,
      })
      .from(userProgressSubparts)
      .where(
        and(eq(userProgressSubparts.userId, userId), eq(userProgressSubparts.chapterId, chapterId))
      );
    const subpartsReadCount = readSubpartsRows.length;

    return {
      summaryRead: totalSubparts > 0 && subpartsReadCount >= totalSubparts,
      subpartsReadCount,
    };
  };

  if (input.eventType === "subpart_read") {
    const result = await db.transaction(async (tx) => {
      const chapterSubpartRows = await tx
        .select({
          id: chapterSubparts.id,
          chapterId: chapterSubparts.chapterId,
        })
        .from(chapterSubparts)
        .where(eq(chapterSubparts.id, input.subpartId))
        .limit(1);
      const chapterSubpart = chapterSubpartRows[0];
      if (!chapterSubpart || chapterSubpart.chapterId !== input.chapterId) {
        throw new Error("Subpart does not belong to the provided chapter.");
      }

      await tx
        .insert(userProgress)
        .values({
          userId: input.userId,
          chapterId: input.chapterId,
          visitedAt: occurredAt,
          summaryRead: false,
          subpartsReadCount: 0,
          exercisesViewed: 0,
          flashcardsCompleted: false,
          quizBestScore: 0,
          quizAttemptsCount: 0,
        })
        .onConflictDoNothing({
          target: [userProgress.userId, userProgress.chapterId],
        });

      const lockedProgressRows = await tx.execute<{
        id: number;
        summary_read: boolean;
        subparts_read_count: number;
      }>(sql`
        select id, summary_read, subparts_read_count
        from user_progress
        where user_id = ${input.userId}
          and chapter_id = ${input.chapterId}
        for update
      `);
      const lockedProgress = lockedProgressRows.rows[0];
      if (!lockedProgress) {
        throw new Error("Could not lock chapter progress row.");
      }

      const insertedSubpartRows = await tx
        .insert(userProgressSubparts)
        .values({
          userId: input.userId,
          chapterId: input.chapterId,
          subpartId: input.subpartId,
          readAt: occurredAt,
        })
        .onConflictDoNothing({
          target: [userProgressSubparts.userId, userProgressSubparts.subpartId],
        })
        .returning({
          subpartId: userProgressSubparts.subpartId,
        });

      const isNewRead = insertedSubpartRows.length > 0;

      const { summaryRead, subpartsReadCount } = isNewRead
        ? await computeSummaryRead({
            chapterId: input.chapterId,
            userId: input.userId,
            tx,
          })
        : {
            summaryRead: lockedProgress.summary_read,
            subpartsReadCount: lockedProgress.subparts_read_count,
          };

      const updatedRows = await tx
        .update(userProgress)
        .set({
          visitedAt: occurredAt,
          summaryRead,
          subpartsReadCount,
        })
        .where(eq(userProgress.id, lockedProgress.id))
        .returning({
          id: userProgress.id,
        });

      const updated = updatedRows[0];
      if (!updated) {
        throw new Error("Could not persist chapter progress.");
      }

      return { progressId: updated.id, isNewRead };
    });

    const snapshot = await selectProgressById(result.progressId);
    if (!snapshot) {
      throw new Error("Could not fetch updated user progress.");
    }

    if (result.isNewRead) {
      await logActivityEvent(input.userId, "subpart_read", input.chapterId, occurredAt);
    }

    return { ...snapshot, isNewRead: result.isNewRead };
  }

  if (input.eventType === "past_paper_attempt") {
    await logActivityEvent(input.userId, "past_paper_attempt", input.chapterId, occurredAt);
    // Past papers don't map to a specific chapter progress row
    return {
      id: 0,
      userId: input.userId,
      chapterId: input.chapterId,
      visitedAt: occurredAt,
      summaryRead: false,
      subpartsReadCount: 0,
      exercisesViewed: 0,
      flashcardsCompleted: false,
      quizBestScore: input.score,
      quizAttemptsCount: 1,
    };
  }

  if (!existing) {
    const insertedRows = await db
      .insert(userProgress)
      .values({
        userId: input.userId,
        chapterId: input.chapterId,
        visitedAt: occurredAt,
        summaryRead: input.eventType === "summary_read",
        subpartsReadCount: 0,
        exercisesViewed: input.eventType === "exercise_view" ? 1 : 0,
        flashcardsCompleted: input.eventType === "flashcard_complete",
        quizBestScore: input.eventType === "quiz_submit" ? input.score : 0,
        quizAttemptsCount: input.eventType === "quiz_submit" ? 1 : 0,
      })
      .returning({
        id: userProgress.id,
      });

    const inserted = insertedRows[0];
    if (!inserted) {
      throw new Error("Could not insert user progress.");
    }

    const snapshot = await selectProgressById(inserted.id);
    if (!snapshot) {
      throw new Error("Could not fetch inserted user progress.");
    }

    await logActivityEvent(input.userId, input.eventType, input.chapterId, occurredAt);

    return snapshot;
  }

  if (input.eventType === "chapter_visit") {
    await db
      .update(userProgress)
      .set({
        visitedAt: occurredAt,
      })
      .where(eq(userProgress.id, existing.id));
  } else if (input.eventType === "summary_read") {
    await db
      .update(userProgress)
      .set({
        visitedAt: occurredAt,
        summaryRead: true,
      })
      .where(eq(userProgress.id, existing.id));
  } else if (input.eventType === "exercise_view") {
    await db
      .update(userProgress)
      .set({
        visitedAt: occurredAt,
        exercisesViewed: existing.exercisesViewed + 1,
      })
      .where(eq(userProgress.id, existing.id));
  } else if (input.eventType === "flashcard_complete") {
    await db
      .update(userProgress)
      .set({
        visitedAt: occurredAt,
        flashcardsCompleted: true,
      })
      .where(eq(userProgress.id, existing.id));
  } else {
    await db
      .update(userProgress)
      .set({
        visitedAt: occurredAt,
        quizBestScore: Math.max(existing.quizBestScore, input.score),
        quizAttemptsCount: existing.quizAttemptsCount + 1,
      })
      .where(eq(userProgress.id, existing.id));
  }

  const snapshot = await selectProgressById(existing.id);
  if (!snapshot) {
    throw new Error("Could not fetch updated user progress.");
  }

  await logActivityEvent(input.userId, input.eventType, input.chapterId, occurredAt);

  if (input.eventType === "quiz_submit") {
    await studyGroupsService.recordQuizScore({
      userId: input.userId,
      chapterId: input.chapterId,
    });
  }

  return snapshot;
};

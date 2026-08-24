import { and, eq, lte, sql, count } from "drizzle-orm";

import { db } from "../lib/db/index.js";
import { withOptionalDbFallback } from "../lib/db-schema-compat.js";
import { flashcardReviews, flashcards, chapters, subjects } from "../lib/db/schema.js";
import type { ReviewState } from "../lib/srs.js";

export interface DueCard {
  reviewId: string;
  cardId: number;
  front: string;
  back: string;
  orderIndex: number;
  chapterId: number;
  chapterTitle: string;
  subjectName: string;
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
  nextReviewDate: Date;
}

export interface ReviewStats {
  totalReviewed: number;
  dueToday: number;
  dueThisWeek: number;
}

export class FlashcardReviewRepository {
  async findDueCards(userId: string): Promise<DueCard[]> {
    return withOptionalDbFallback(
      "flashcard_reviews.due",
      async () => {
        const now = new Date();

        const rows = await db
          .select({
            reviewId: flashcardReviews.id,
            cardId: flashcardReviews.cardId,
            front: flashcards.front,
            back: flashcards.back,
            orderIndex: flashcards.orderIndex,
            chapterId: flashcards.chapterId,
            chapterTitle: chapters.title,
            subjectName: subjects.name,
            intervalDays: flashcardReviews.intervalDays,
            easeFactor: flashcardReviews.easeFactor,
            repetitions: flashcardReviews.repetitions,
            nextReviewDate: flashcardReviews.nextReviewDate,
          })
          .from(flashcardReviews)
          .innerJoin(flashcards, eq(flashcardReviews.cardId, flashcards.id))
          .innerJoin(chapters, eq(flashcards.chapterId, chapters.id))
          .innerJoin(subjects, eq(chapters.subjectId, subjects.id))
          .where(
            and(eq(flashcardReviews.userId, userId), lte(flashcardReviews.nextReviewDate, now))
          )
          .orderBy(flashcardReviews.nextReviewDate);

        return rows;
      },
      () => []
    );
  }

  async upsertReview(userId: string, cardId: number, reviewState: ReviewState): Promise<void> {
    const now = new Date();

    await db
      .insert(flashcardReviews)
      .values({
        cardId,
        userId,
        intervalDays: reviewState.intervalDays,
        easeFactor: reviewState.easeFactor,
        repetitions: reviewState.repetitions,
        nextReviewDate: reviewState.nextReviewDate,
        lastReviewedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [flashcardReviews.cardId, flashcardReviews.userId],
        set: {
          intervalDays: reviewState.intervalDays,
          easeFactor: reviewState.easeFactor,
          repetitions: reviewState.repetitions,
          nextReviewDate: reviewState.nextReviewDate,
          lastReviewedAt: now,
          updatedAt: now,
        },
      });
  }

  async getReviewStats(userId: string): Promise<ReviewStats> {
    return withOptionalDbFallback(
      "flashcard_reviews.stats",
      async () => {
        const now = new Date();

        const endOfWeek = new Date(now);
        endOfWeek.setDate(endOfWeek.getDate() + 7);

        const [totalResult, dueNowResult, dueWeekResult] = await Promise.all([
          db
            .select({ total: count() })
            .from(flashcardReviews)
            .where(
              and(
                eq(flashcardReviews.userId, userId),
                sql`${flashcardReviews.lastReviewedAt} IS NOT NULL`
              )
            ),
          db
            .select({ total: count() })
            .from(flashcardReviews)
            .where(
              and(eq(flashcardReviews.userId, userId), lte(flashcardReviews.nextReviewDate, now))
            ),
          db
            .select({ total: count() })
            .from(flashcardReviews)
            .where(
              and(
                eq(flashcardReviews.userId, userId),
                lte(flashcardReviews.nextReviewDate, endOfWeek)
              )
            ),
        ]);

        return {
          totalReviewed: totalResult[0]?.total ?? 0,
          dueToday: dueNowResult[0]?.total ?? 0,
          dueThisWeek: dueWeekResult[0]?.total ?? 0,
        };
      },
      () => ({ totalReviewed: 0, dueToday: 0, dueThisWeek: 0 })
    );
  }

  async findReview(
    userId: string,
    cardId: number
  ): Promise<
    | {
        intervalDays: number;
        easeFactor: number;
        repetitions: number;
        nextReviewDate: Date;
      }
    | undefined
  > {
    const rows = await db
      .select({
        intervalDays: flashcardReviews.intervalDays,
        easeFactor: flashcardReviews.easeFactor,
        repetitions: flashcardReviews.repetitions,
        nextReviewDate: flashcardReviews.nextReviewDate,
      })
      .from(flashcardReviews)
      .where(and(eq(flashcardReviews.userId, userId), eq(flashcardReviews.cardId, cardId)))
      .limit(1);

    return rows[0];
  }

  async seedInitialReviews(
    userId: string,
    cards: Array<{ cardId: number; status: "known" | "review" }>
  ): Promise<void> {
    if (cards.length === 0) return;

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const values = cards.map((card) => ({
      cardId: card.cardId,
      userId,
      intervalDays: card.status === "known" ? 1 : 0,
      easeFactor: 2.5,
      repetitions: card.status === "known" ? 1 : 0,
      nextReviewDate: card.status === "known" ? tomorrow : now,
      lastReviewedAt: now,
      updatedAt: now,
    }));

    await db
      .insert(flashcardReviews)
      .values(values)
      .onConflictDoNothing({
        target: [flashcardReviews.cardId, flashcardReviews.userId],
      });
  }
}

export const flashcardReviewRepository = new FlashcardReviewRepository();

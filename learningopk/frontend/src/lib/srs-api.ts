import { z } from "zod";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

/* ------------------------------------------------------------------ */
/*  Schemas                                                            */
/* ------------------------------------------------------------------ */

const dueCardSchema = z.object({
  reviewId: z.string(),
  cardId: z.number().int().positive(),
  front: z.string(),
  back: z.string(),
  orderIndex: z.number().int().min(0),
  chapterId: z.number().int().positive(),
  chapterTitle: z.string(),
  subjectName: z.string(),
  intervalDays: z.number().int().min(0),
  easeFactor: z.number(),
  repetitions: z.number().int().min(0),
  nextReviewDate: z.string(),
});

const dueCardsResponseSchema = z.object({
  dueCards: z.array(dueCardSchema),
  totalDue: z.number().int().min(0),
});

const reviewStatsSchema = z.object({
  totalReviewed: z.number().int().min(0),
  dueToday: z.number().int().min(0),
  dueThisWeek: z.number().int().min(0),
});

const reviewResponseSchema = z.object({
  intervalDays: z.number().int().min(0),
  easeFactor: z.number(),
  repetitions: z.number().int().min(0),
  nextReviewDate: z.string(),
});

const seedResponseSchema = z.object({
  seeded: z.number().int().min(0),
});

export type DueCard = z.infer<typeof dueCardSchema>;
export type DueCardsResponse = z.infer<typeof dueCardsResponseSchema>;
export type ReviewStats = z.infer<typeof reviewStatsSchema>;
export type ReviewResponse = z.infer<typeof reviewResponseSchema>;
export type RecallRating = "again" | "hard" | "good" | "easy";

/* ------------------------------------------------------------------ */
/*  API functions (client-side, with credentials)                      */
/* ------------------------------------------------------------------ */

/**
 * Fetch due flashcard reviews for the current user (client-side).
 */
export async function fetchDueCards(): Promise<DueCardsResponse> {
  const response = await fetch(`${backendUrl}/api/flashcard-reviews/due`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch due cards: ${response.status}`);
  }

  const json: unknown = await response.json();
  return dueCardsResponseSchema.parse(json);
}

/**
 * Fetch review stats for the dashboard (client-side).
 */
export async function fetchReviewStats(): Promise<ReviewStats> {
  const response = await fetch(`${backendUrl}/api/flashcard-reviews/stats`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch review stats: ${response.status}`);
  }

  const json: unknown = await response.json();
  return reviewStatsSchema.parse(json);
}

/**
 * Submit a review rating for a flashcard (client-side).
 */
export async function submitReview(
  cardId: number,
  rating: RecallRating
): Promise<ReviewResponse> {
  const response = await fetch(
    `${backendUrl}/api/flashcard-reviews/${cardId}/review`,
    {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rating }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to submit review: ${response.status}`);
  }

  const json: unknown = await response.json();
  return reviewResponseSchema.parse(json);
}

/**
 * Seed initial flashcard reviews when a user completes a deck (client-side).
 */
export async function seedFlashcardReviews(
  cards: Array<{ cardId: number; status: "known" | "review" }>
): Promise<number> {
  const response = await fetch(`${backendUrl}/api/flashcard-reviews/seed`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ cards }),
  });

  if (!response.ok) {
    throw new Error(`Failed to seed reviews: ${response.status}`);
  }

  const json: unknown = await response.json();
  const result = seedResponseSchema.parse(json);
  return result.seeded;
}

/**
 * Fetch review stats from the server side (with cookie header).
 */
export async function getReviewStatsServer(
  cookieHeader: string
): Promise<ReviewStats | null> {
  try {
    const response = await fetch(`${backendUrl}/api/flashcard-reviews/stats`, {
      method: "GET",
      cache: "no-store",
      headers: { cookie: cookieHeader },
    });

    if (!response.ok) {
      return null;
    }

    const json: unknown = await response.json();
    return reviewStatsSchema.parse(json);
  } catch {
    return null;
  }
}

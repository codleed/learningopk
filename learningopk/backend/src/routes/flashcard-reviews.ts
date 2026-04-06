import { Router } from "express";
import { z } from "zod";

import { requireSession } from "../lib/session.js";
import type { AuthenticatedRequest } from "../lib/session.js";
import { calculateNextReview, type RecallRating } from "../lib/srs.js";
import { flashcardReviewRepository } from "../repositories/flashcard-review.repository.js";

const reviewBodySchema = z.object({
  rating: z.enum(["again", "hard", "good", "easy"]),
});

const seedBodySchema = z.object({
  cards: z.array(
    z.object({
      cardId: z.number().int().positive(),
      status: z.enum(["known", "review"]),
    })
  ).min(1),
});

export const flashcardReviewsRouter = Router();

/**
 * GET /api/flashcard-reviews/due
 * Returns all overdue flashcard reviews for the current user.
 */
flashcardReviewsRouter.get("/due", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  const userId = authedReq.session.user.id;

  try {
    const dueCards = await flashcardReviewRepository.findDueCards(userId);

    res.status(200).json({
      dueCards,
      totalDue: dueCards.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/flashcard-reviews/stats
 * Returns review statistics for the dashboard widget.
 */
flashcardReviewsRouter.get("/stats", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  const userId = authedReq.session.user.id;

  try {
    const stats = await flashcardReviewRepository.getReviewStats(userId);

    res.status(200).json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/flashcard-reviews/:cardId/review
 * Submit a review rating for a flashcard.
 */
flashcardReviewsRouter.post("/:cardId/review", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  const userId = authedReq.session.user.id;

  const cardId = Number(req.params.cardId);
  if (!Number.isFinite(cardId) || cardId <= 0) {
    res.status(400).json({ error: "Invalid card ID" });
    return;
  }

  const parsed = reviewBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid review payload",
      details: parsed.error.flatten(),
    });
    return;
  }

  const { rating } = parsed.data;

  try {
    // Get current review state, or create defaults for first review
    const existing = await flashcardReviewRepository.findReview(userId, cardId);

    const currentState = existing ?? {
      intervalDays: 0,
      easeFactor: 2.5,
      repetitions: 0,
      nextReviewDate: new Date(),
    };

    const newState = calculateNextReview(currentState, rating as RecallRating);

    await flashcardReviewRepository.upsertReview(userId, cardId, newState);

    res.status(200).json({
      intervalDays: newState.intervalDays,
      easeFactor: newState.easeFactor,
      repetitions: newState.repetitions,
      nextReviewDate: newState.nextReviewDate.toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/flashcard-reviews/seed
 * Seed initial flashcard reviews when a user completes a flashcard deck.
 * Cards marked "known" get next review in 1 day; "review" cards get reviewed today.
 */
flashcardReviewsRouter.post("/seed", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  const userId = authedReq.session.user.id;

  const parsed = seedBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid seed payload",
      details: parsed.error.flatten(),
    });
    return;
  }

  try {
    await flashcardReviewRepository.seedInitialReviews(userId, parsed.data.cards);

    res.status(200).json({ seeded: parsed.data.cards.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

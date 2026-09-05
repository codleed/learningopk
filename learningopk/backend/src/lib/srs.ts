/**
 * SM-2 Spaced Repetition Algorithm
 *
 * Implements a simplified SM-2 algorithm for calculating next review dates
 * based on user recall quality ratings.
 */

export type RecallRating = "again" | "hard" | "good" | "easy";

export interface ReviewState {
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
  nextReviewDate: Date;
}

const MIN_EASE_FACTOR = 1.3;

/**
 * Calculates the next review state based on the current state and user rating.
 *
 * SM-2 rules:
 * - Again (quality=0): Reset interval to 0, reset repetitions, ease stays, review now
 * - Hard  (quality=2): interval = max(1, current * 1.2), ease -= 0.15 (min 1.3), repetitions+1
 * - Good  (quality=3): rep=0 → 1 day, rep=1 → 2 days, else → current * ease, repetitions+1
 * - Easy  (quality=5): interval = current * ease * 1.3, ease += 0.15, repetitions+1
 */
export function calculateNextReview(current: ReviewState, rating: RecallRating): ReviewState {
  const now = new Date();

  switch (rating) {
    case "again": {
      return {
        intervalDays: 0,
        easeFactor: current.easeFactor,
        repetitions: 0,
        nextReviewDate: now,
      };
    }

    case "hard": {
      const newInterval = Math.max(1, Math.round(current.intervalDays * 1.2));
      const newEase = Math.max(MIN_EASE_FACTOR, current.easeFactor - 0.15);
      const nextDate = new Date(now);
      nextDate.setDate(nextDate.getDate() + newInterval);

      return {
        intervalDays: newInterval,
        easeFactor: newEase,
        repetitions: current.repetitions + 1,
        nextReviewDate: nextDate,
      };
    }

    case "good": {
      let newInterval: number;
      if (current.repetitions === 0) {
        newInterval = 1;
      } else if (current.repetitions === 1) {
        newInterval = 2;
      } else {
        newInterval = Math.round(current.intervalDays * current.easeFactor);
      }

      const nextDate = new Date(now);
      nextDate.setDate(nextDate.getDate() + newInterval);

      return {
        intervalDays: newInterval,
        easeFactor: current.easeFactor,
        repetitions: current.repetitions + 1,
        nextReviewDate: nextDate,
      };
    }

    case "easy": {
      const baseInterval = current.intervalDays > 0 ? current.intervalDays : 1;
      const newInterval = Math.round(baseInterval * current.easeFactor * 1.3);
      const newEase = current.easeFactor + 0.15;
      const nextDate = new Date(now);
      nextDate.setDate(nextDate.getDate() + newInterval);

      return {
        intervalDays: newInterval,
        easeFactor: newEase,
        repetitions: current.repetitions + 1,
        nextReviewDate: nextDate,
      };
    }
  }
}

/**
 * Returns the human-readable next review interval preview for each rating.
 */
export function getNextReviewPreviews(current: ReviewState): Record<RecallRating, string> {
  return {
    again: "Now",
    hard: "+1 day",
    good:
      current.repetitions === 0
        ? "+1 day"
        : current.repetitions === 1
          ? "+2 days"
          : `+${Math.round(current.intervalDays * current.easeFactor)} days`,
    easy: `+${Math.round((current.intervalDays > 0 ? current.intervalDays : 1) * current.easeFactor * 1.3)} days`,
  };
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock, Zap, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { LoadingSkeleton, ErrorState } from "@/components/ui/states";
import { fetchDueCards, submitReview, type DueCard, type RecallRating } from "@/lib/srs-api";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ReviewPhase = "loading" | "reviewing" | "complete" | "error";

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function SrsFlashcard({
  card,
  isFlipped,
  onFlip,
}: {
  card: DueCard;
  isFlipped: boolean;
  onFlip: () => void;
}) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onFlip}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onFlip();
        }
      }}
      className="surface-card cursor-pointer select-none rounded-2xl border border-border-default p-6 transition-all duration-200 hover:shadow-[var(--shadow-card)]"
    >
      <div className="mb-3 flex items-center justify-between">
        <Badge variant="default" size="sm">
          {card.subjectName}
        </Badge>
        <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
          {card.chapterTitle}
        </span>
      </div>

      <div className="min-h-[120px] text-xl font-semibold text-text-primary">
        <MarkdownRenderer content={isFlipped ? card.back : card.front} />
      </div>

      <p className="mt-4 text-center text-xs text-text-muted">
        {isFlipped ? "Showing answer" : "Tap to reveal answer"}
      </p>
    </article>
  );
}

function RatingButtons({
  onRate,
  isSubmitting,
}: {
  onRate: (rating: RecallRating) => void;
  isSubmitting: boolean;
}) {
  const ratings: Array<{
    value: RecallRating;
    label: string;
    preview: string;
    variant: "danger" | "secondary" | "success" | "primary";
  }> = [
    { value: "again", label: "Again", preview: "Now", variant: "danger" },
    { value: "hard", label: "Hard", preview: "+1 day", variant: "secondary" },
    { value: "good", label: "Good", preview: "+2 days", variant: "success" },
    { value: "easy", label: "Easy", preview: "+3 days", variant: "primary" },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {ratings.map((r) => (
        <Button
          key={r.value}
          type="button"
          variant={r.variant}
          size="md"
          disabled={isSubmitting}
          onClick={() => onRate(r.value)}
          className="flex flex-col items-center gap-0.5 py-3"
        >
          <span className="text-sm font-semibold">{r.label}</span>
          <span className="text-[10px] font-normal opacity-70">{r.preview}</span>
        </Button>
      ))}
    </div>
  );
}

function CompletionScreen({
  reviewedCount,
  onReturnToDashboard,
}: {
  reviewedCount: number;
  onReturnToDashboard: () => void;
}) {
  return (
    <Card variant="default" className="text-center">
      <CardBody className="flex flex-col items-center gap-4 py-12">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-success/10">
          <CheckCircle2 className="h-8 w-8 text-accent-success" />
        </div>
        <h2 className="font-[var(--font-display)] text-2xl font-bold text-text-primary">
          All caught up!
        </h2>
        <p className="max-w-sm text-sm text-text-secondary">
          You reviewed <span className="font-semibold text-text-primary">{reviewedCount}</span> card
          {reviewedCount !== 1 ? "s" : ""} this session. Great job keeping your knowledge fresh!
        </p>
        <Button
          type="button"
          variant="primary"
          size="lg"
          onClick={onReturnToDashboard}
          iconRight={<ChevronRight />}
        >
          Back to Dashboard
        </Button>
      </CardBody>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function SrsReviewDeck() {
  const [phase, setPhase] = useState<ReviewPhase>("loading");
  const [dueCards, setDueCards] = useState<DueCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [_errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDueCards = useCallback(async () => {
    setPhase("loading");
    try {
      const data = await fetchDueCards();
      setDueCards(data.dueCards);
      setCurrentIndex(0);
      setIsFlipped(false);
      setReviewedCount(0);

      if (data.dueCards.length === 0) {
        setPhase("complete");
      } else {
        setPhase("reviewing");
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load cards");
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    void loadDueCards();
  }, [loadDueCards]);

  const handleRate = async (rating: RecallRating) => {
    const card = dueCards[currentIndex];
    if (!card) return;

    setIsSubmitting(true);
    try {
      await submitReview(card.cardId, rating);
      setReviewedCount((prev) => prev + 1);

      if (currentIndex + 1 < dueCards.length) {
        setCurrentIndex((prev) => prev + 1);
        setIsFlipped(false);
      } else {
        setPhase("complete");
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to submit review");
      setPhase("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturnToDashboard = () => {
    window.location.href = "/dashboard";
  };

  /* ---- Loading ---- */
  if (phase === "loading") {
    return <LoadingSkeleton title="Loading flashcards" rows={4} variant="card" />;
  }

  /* ---- Error ---- */
  if (phase === "error") {
    return (
      <ErrorState
        title="Failed to load review cards"
        description="We couldn't load your flashcards. Please try again."
        onRetry={() => void loadDueCards()}
        retryLabel="Retry"
      />
    );
  }

  /* ---- Complete ---- */
  if (phase === "complete") {
    return (
      <CompletionScreen
        reviewedCount={reviewedCount}
        onReturnToDashboard={handleReturnToDashboard}
      />
    );
  }

  /* ---- Reviewing ---- */
  const currentCard = dueCards[currentIndex];
  if (!currentCard) return null;

  const remaining = dueCards.length - currentIndex;

  return (
    <div className="space-y-5">
      {/* Progress header */}
      <Card variant="default">
        <CardHeader className="pb-2 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-accent-primary" aria-hidden />
              <p className="text-sm font-semibold text-text-primary">Review Session</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="primary" size="sm">
                {currentIndex + 1} / {dueCards.length}
              </Badge>
              <span className="flex items-center gap-1 text-xs text-text-muted">
                <Clock className="h-3 w-3" aria-hidden />
                {remaining} remaining
              </span>
            </div>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-bg-subtle">
            <div
              className="h-full rounded-full bg-[var(--accent-primary)] transition-all duration-300"
              style={{
                width: `${Math.round(((currentIndex + 1) / dueCards.length) * 100)}%`,
              }}
            />
          </div>
        </CardHeader>
      </Card>

      {/* Flashcard */}
      <SrsFlashcard
        card={currentCard}
        isFlipped={isFlipped}
        onFlip={() => setIsFlipped((prev) => !prev)}
      />

      {/* Rating buttons (shown only after flip) */}
      {isFlipped && (
        <div className="space-y-2">
          <p className="text-center text-xs font-medium text-text-secondary">
            How well did you remember?
          </p>
          <RatingButtons onRate={(rating) => void handleRate(rating)} isSubmitting={isSubmitting} />
        </div>
      )}

      {/* Flip hint when not flipped */}
      {!isFlipped && (
        <div className="text-center">
          <Button type="button" variant="secondary" size="md" onClick={() => setIsFlipped(true)}>
            Show Answer
          </Button>
        </div>
      )}
    </div>
  );
}

import type { ChapterDetailResponse } from "@/lib/learn-api";

import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

type Flashcard = ChapterDetailResponse["flashcards"][number];
type CardStatus = "known" | "review" | null;

type FlashcardCardProps = {
  card: Flashcard;
  cardIndex: number;
  totalCards: number;
  isBackVisible: boolean;
  currentStatus: CardStatus;
  onToggleSide: () => void;
  onMarkKnown: () => void;
  onMarkReview: () => void;
};

export function FlashcardCard({
  card,
  cardIndex,
  totalCards,
  isBackVisible,
  currentStatus,
  onToggleSide,
  onMarkKnown,
  onMarkReview
}: FlashcardCardProps) {
  return (
    <article className="surface-card rounded-2xl border border-border p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Card {cardIndex + 1} of {totalCards}
      </p>
      <div className="mt-3 text-xl font-semibold text-foreground">
        <MarkdownRenderer content={isBackVisible ? card.back : card.front} />
      </div>
      <Button type="button" onClick={onToggleSide} variant="secondary" className="mt-5">
        {isBackVisible ? "Show front" : "Show back"}
      </Button>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button type="button" onClick={onMarkKnown} variant={currentStatus === "known" ? "primary" : "secondary"} size="sm">
          Mark known
        </Button>
        <Button type="button" onClick={onMarkReview} variant={currentStatus === "review" ? "danger" : "secondary"} size="sm">
          Mark review
        </Button>
      </div>
    </article>
  );
}


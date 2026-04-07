"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import type { ChapterDetailResponse } from "@/lib/learn-api";
import { trackProgressEvent } from "@/lib/progress-client";
import { seedFlashcardReviews } from "@/lib/srs-api";

import { updateChapterProgress, getChapterProgress } from "@/lib/gamification-storage";
import { FlashcardCard } from "./flashcard-card";

type Flashcard = ChapterDetailResponse["flashcards"][number];
type CardStatus = "known" | "review";
type StoredStatuses = Record<string, CardStatus>;

const storedStatusesSchema = z.record(z.string(), z.enum(["known", "review"]));

type FlashcardDeckProps = {
  chapterId: number;
  flashcards: Flashcard[];
  storageKey: string;
};

const readStoredStatuses = (storageKey: string): StoredStatuses => {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return {};
    }

    const parsed = storedStatusesSchema.safeParse(JSON.parse(raw) as unknown);
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
};

const persistStatuses = (storageKey: string, statuses: StoredStatuses): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(statuses));
};

export function FlashcardDeck({ chapterId, flashcards, storageKey }: FlashcardDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isBackVisible, setIsBackVisible] = useState(false);
  const [statusOverridesByStorageKey, setStatusOverridesByStorageKey] = useState<Record<string, StoredStatuses>>({});
  const trackedCompletionStorageKeys = useRef(new Set<string>());

  const isHydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );

  const persistedStatuses = useMemo(() => {
    if (!isHydrated) {
      return {};
    }

    return readStoredStatuses(storageKey);
  }, [isHydrated, storageKey]);

  const statusOverrides = useMemo(
    () => statusOverridesByStorageKey[storageKey] ?? {},
    [statusOverridesByStorageKey, storageKey]
  );

  const statuses = useMemo(
    () => ({
      ...persistedStatuses,
      ...statusOverrides
    }),
    [persistedStatuses, statusOverrides]
  );

  const cardCount = flashcards.length;
  const currentCard = flashcards[currentIndex];

  const stats = useMemo(() => {
    const statusValues = Object.values(statuses);
    const known = statusValues.filter((value) => value === "known").length;
    const review = statusValues.filter((value) => value === "review").length;
    return {
      known,
      review,
      completed: known + review,
      progressPercent: cardCount > 0 ? Math.round(((known + review) / cardCount) * 100) : 0
    };
  }, [cardCount, statuses]);

  useEffect(() => {
    if (cardCount === 0 || stats.completed !== cardCount || trackedCompletionStorageKeys.current.has(storageKey)) {
      return;
    }

    trackedCompletionStorageKeys.current.add(storageKey);
    void trackProgressEvent({
      eventType: "flashcard_complete",
      chapterId
    });

    // Seed SRS reviews for all rated flashcards
    const allStatuses = { ...persistedStatuses, ...statusOverrides };
    const srsCards = flashcards
      .filter((card) => allStatuses[String(card.id)] !== undefined)
      .map((card) => ({
        cardId: card.id,
        status: allStatuses[String(card.id)] as "known" | "review",
      }));

    if (srsCards.length > 0) {
      void seedFlashcardReviews(srsCards);
    }
  }, [cardCount, chapterId, stats.completed, storageKey, flashcards, persistedStatuses, statusOverrides]);

  if (!currentCard) {
    return (
      <EmptyState
        title="No flashcards available"
        description="This chapter does not have flashcards yet. Review the summary and exercises for now."
      />
    );
  }

  const currentStatus = statuses[String(currentCard.id)] ?? null;

  const setStatus = (status: CardStatus) => {
    setStatusOverridesByStorageKey((previous) => {
      const existingOverrides = previous[storageKey] ?? {};
      const next = {
        ...existingOverrides,
        [String(currentCard.id)]: status
      };

      persistStatuses(storageKey, {
        ...persistedStatuses,
        ...next
      });

      // Sync to gamification storage so QuestTabBar progress stays accurate
      const currentProgress = getChapterProgress(String(chapterId));
      const updatedReviewed = {
        ...currentProgress.flashcardsReviewed,
        [String(currentCard.id)]: status,
      };
      updateChapterProgress(String(chapterId), {
        flashcardsReviewed: updatedReviewed,
      });

      // Notify the workspace that chapter progress changed
      window.dispatchEvent(new CustomEvent("chapter-progress-updated"));

      return {
        ...previous,
        [storageKey]: next
      };
    });
  };

  return (
    <div className="space-y-5">
      <div className="surface-card rounded-xl border border-border-default p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-text-primary">
            Progress {stats.completed}/{cardCount} ({stats.progressPercent}%)
          </p>
          <p className="text-xs text-text-secondary">
            Known: {stats.known} | Review: {stats.review}
          </p>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-bg-subtle">
          <div className="h-full rounded-full bg-[var(--primary)] transition-all" style={{ width: `${stats.progressPercent}%` }} />
        </div>
      </div>

      <FlashcardCard
        card={currentCard}
        cardIndex={currentIndex}
        totalCards={cardCount}
        isBackVisible={isBackVisible}
        currentStatus={currentStatus}
        onToggleSide={() => setIsBackVisible((value) => !value)}
        onMarkKnown={() => setStatus("known")}
        onMarkReview={() => setStatus("review")}
      />

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setCurrentIndex((value) => Math.max(0, value - 1));
            setIsBackVisible(false);
          }}
          disabled={currentIndex === 0}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setCurrentIndex((value) => Math.min(cardCount - 1, value + 1));
            setIsBackVisible(false);
          }}
          disabled={currentIndex === cardCount - 1}
        >
          Next
        </Button>
      </div>
    </div>
  );
}


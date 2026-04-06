"use client";

import { useCallback, useMemo } from "react";
import dynamic from "next/dynamic";

import type { ChapterDetailResponse } from "@/lib/learn-api";
import { EmptyState, LoadingSkeleton } from "@/components/ui/states";
import { updateChapterProgress, getChapterProgress } from "@/lib/gamification-storage";

import { useChapter } from "./chapter-context";
import { VirtualizedMarkdown } from "@/components/VirtualizedMarkdown";

// ── Dynamic imports for heavy tab-panel components ──────────────────────────
// Each tab panel is lazily loaded with next/dynamic so only the active tab's
// JS is fetched. SSR is disabled because these are interactive client-only
// components (localStorage, timers, animations, fetch with credentials).

const ChapterExercisesWithAi = dynamic(
  () => import("./chapter-exercises-with-ai").then((mod) => mod.ChapterExercisesWithAi),
  {
    ssr: false,
    loading: () => <LoadingSkeleton title="Loading exercises..." rows={4} variant="card" />,
  }
);

const FlashcardDeck = dynamic(
  () => import("./flashcard-deck").then((mod) => mod.FlashcardDeck),
  {
    ssr: false,
    loading: () => <LoadingSkeleton title="Loading flashcards..." rows={3} variant="card" />,
  }
);

const QuizRunner = dynamic(
  () => import("./quiz-runner").then((mod) => mod.QuizRunner),
  {
    ssr: false,
    loading: () => <LoadingSkeleton title="Loading quiz..." rows={5} variant="card" />,
  }
);

const QuestIllustrationView = dynamic(
  () => import("./quest-illustration-view").then((mod) => mod.QuestIllustrationView),
  {
    ssr: false,
    loading: () => <LoadingSkeleton title="Loading illustrations..." rows={4} variant="card" />,
  }
);

const QuickRevisionView = dynamic(
  () => import("./quick-revision-view").then((mod) => mod.QuickRevisionView),
  {
    ssr: false,
    loading: () => <LoadingSkeleton title="Loading revision notes..." rows={4} variant="card" />,
  }
);

const MobileAiFab = dynamic(
  () => import("./mobile-ai-fab").then((mod) => mod.MobileAiFab),
  { ssr: false }
);

type ChapterStudyContentWithAiProps = {
  trainingExercises: ChapterDetailResponse["exercises"];
  illustrationExercises: ChapterDetailResponse["exercises"];
  illustrationCompletedIds: number[];
  onPromptChange?: (prompt: string) => void;
};

export function ChapterStudyContentWithAi({
  trainingExercises,
  illustrationExercises,
  illustrationCompletedIds,
  onPromptChange,
}: ChapterStudyContentWithAiProps) {
  const {
    activeTab,
    chapterId,
    chapterTitle,
    chapterNumber,
    chapterSummary: summary,
    chapterRevisionNotes: revisionNotes,
    subjectName,
    flashcards,
    quiz,
    flashcardStorageKey,
    autoOpenAi,
    challengeId,
  } = useChapter();

  /** Persist illustration exercise completion to gamification storage. */
  const handleIllustrationComplete = useCallback(
    (_exerciseId: number, _difficulty: "easy" | "medium" | "hard") => {
      const current = getChapterProgress(String(chapterId));
      const alreadyCompleted = current?.exercisesCompleted ?? [];
      if (alreadyCompleted.includes(_exerciseId)) return;

      updateChapterProgress(String(chapterId), {
        exercisesCompleted: [...alreadyCompleted, _exerciseId],
      });

      // XP is tracked at the gamification hook level; this persists the ID.
      void _difficulty; // difficulty used for XP calc at hook level
    },
    [chapterId]
  );

  /** Live completed IDs that reflect localStorage writes within the session. */
  const liveIllustrationCompletedIds = useMemo(() => {
    const current = getChapterProgress(String(chapterId));
    const completedAll = current?.exercisesCompleted ?? [];
    const numericalIds = new Set(illustrationExercises.map((e) => e.id));
    return completedAll.filter((id) => numericalIds.has(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- also recompute when prop changes
  }, [chapterId, illustrationExercises, illustrationCompletedIds]);

  return (
    <div className="min-w-0">
      {activeTab === "summary" ? (
        <div data-testid="chapter-summary-markdown">
          <VirtualizedMarkdown content={summary} threshold={5000} />
        </div>
      ) : null}

      {activeTab === "quick-revision" ? (
        <QuickRevisionView
          chapterTitle={chapterTitle}
          chapterNumber={chapterNumber}
          revisionNotes={revisionNotes}
        />
      ) : null}

      {activeTab === "exercises" ? (
        <ChapterExercisesWithAi
          chapterId={chapterId}
          chapterTitle={chapterTitle}
          exercises={trainingExercises}
          initialAiOpen={autoOpenAi}
          showSidebar={false}
          onPromptChange={onPromptChange}
        />
      ) : null}

      {activeTab === "flashcards" ? (
        <FlashcardDeck chapterId={chapterId} flashcards={flashcards} storageKey={flashcardStorageKey} />
      ) : null}

      {activeTab === "quiz" ? (
        quiz ? (
          <QuizRunner quiz={quiz} subjectName={subjectName} chapterNumber={chapterNumber} chapterTitle={chapterTitle} challengeId={challengeId} />
        ) : (
          <EmptyState
            title="Quiz unavailable"
            description="This chapter does not have a quiz yet. Continue with summary, exercises, and flashcards."
          />
        )
      ) : null}

      {activeTab === "illustration" ? (
        <QuestIllustrationView
          exercises={illustrationExercises}
          completedIds={liveIllustrationCompletedIds}
          onMarkComplete={handleIllustrationComplete}
        />
      ) : null}

      {/* Mobile-only floating AI button + bottom sheet drawer */}
      <MobileAiFab />
    </div>
  );
}

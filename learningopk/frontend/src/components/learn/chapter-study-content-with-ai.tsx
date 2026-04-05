"use client";

import { useCallback, useMemo } from "react";

import type { ChapterDetailResponse } from "@/lib/learn-api";
import { EmptyState } from "@/components/ui/states";
import { updateChapterProgress, getChapterProgress } from "@/lib/gamification-storage";

import { ChapterExercisesWithAi } from "./chapter-exercises-with-ai";
import { FlashcardDeck } from "./flashcard-deck";
import { VirtualizedMarkdown } from "@/components/VirtualizedMarkdown";
import { QuizRunner } from "./quiz-runner";
import { QuestIllustrationView } from "./quest-illustration-view";
import { QuickRevisionView } from "./quick-revision-view";

type ChapterTab = "summary" | "quick-revision" | "exercises" | "flashcards" | "quiz" | "illustration";

type ChapterStudyContentWithAiProps = {
  activeTab: ChapterTab;
  chapterId: number;
  chapterTitle: string;
  chapterNumber?: number;
  summary: string;
  revisionNotes: ChapterDetailResponse["chapter"]["revisionNotes"];
  subjectName?: string;
  exercises: ChapterDetailResponse["exercises"];
  illustrationExercises: ChapterDetailResponse["exercises"];
  illustrationCompletedIds: number[];
  flashcards: ChapterDetailResponse["flashcards"];
  quiz: ChapterDetailResponse["quiz"];
  flashcardStorageKey: string;
  autoOpenAi?: boolean;
  onPromptChange?: (prompt: string) => void;
};

export function ChapterStudyContentWithAi({
  activeTab,
  chapterId,
  chapterTitle,
  chapterNumber,
  summary,
  revisionNotes,
  subjectName,
  exercises,
  illustrationExercises,
  illustrationCompletedIds,
  flashcards,
  quiz,
  flashcardStorageKey,
  autoOpenAi = false,
  onPromptChange,
}: ChapterStudyContentWithAiProps) {
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
          exercises={exercises}
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
          <QuizRunner quiz={quiz} subjectName={subjectName} chapterNumber={chapterNumber} chapterTitle={chapterTitle} />
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
    </div>
  );
}

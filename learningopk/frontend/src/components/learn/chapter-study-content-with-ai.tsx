"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";

import type { ChapterDetailResponse } from "@/lib/learn-api";
import { EmptyState, LoadingSkeleton } from "@/components/ui/states";
import { getChapterProgress } from "@/lib/gamification-storage";

import { useChapter } from "./chapter-context";

// ── Dynamic imports for heavy tab-panel components ──────────────────────────
// Each tab panel is lazily loaded with next/dynamic so only the active tab's
// JS is fetched. SSR is disabled because these are interactive client-only
// components (localStorage, timers, animations, fetch with credentials).

const QuestSummaryView = dynamic(
  () => import("./quest-summary-view").then((mod) => mod.QuestSummaryView),
  {
    ssr: false,
    loading: () => <LoadingSkeleton title="Loading summary..." rows={4} variant="card" />,
  }
);

const ChapterExercisesWithAi = dynamic(
  () => import("./chapter-exercises-with-ai").then((mod) => mod.ChapterExercisesWithAi),
  {
    ssr: false,
    loading: () => <LoadingSkeleton title="Loading exercises..." rows={4} variant="card" />,
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
  trainingCompletedIds: number[];
  summaryRead: boolean;
  onMarkSummaryRead: () => void;
  onMarkExerciseComplete: (exerciseId: number, difficulty: "easy" | "medium" | "hard") => void;
  onQuizComplete: (score: number, percentage: number) => void;
  onPromptChange?: (prompt: string) => void;
};

export function ChapterStudyContentWithAi({
  trainingExercises,
  illustrationExercises,
  illustrationCompletedIds,
  trainingCompletedIds,
  summaryRead,
  onMarkSummaryRead,
  onMarkExerciseComplete,
  onQuizComplete,
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
    quiz,
    autoOpenAi,
    challengeId,
  } = useChapter();

  /** Live completed IDs that reflect localStorage writes within the session. */
  const liveIllustrationCompletedIds = useMemo(() => {
    const current = getChapterProgress(String(chapterId));
    const completedAll = current?.exercisesCompleted ?? [];
    const numericalIds = new Set(illustrationExercises.map((e) => e.id));
    return completedAll.filter((id) => numericalIds.has(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- also recompute when prop changes
  }, [chapterId, illustrationExercises, illustrationCompletedIds]);

  /** Live completed IDs for training exercises within the session. */
  const liveExerciseCompletedIds = useMemo(() => {
    const current = getChapterProgress(String(chapterId));
    const completedAll = current?.exercisesCompleted ?? [];
    const trainingIds = new Set(trainingExercises.map((e) => e.id));
    return completedAll.filter((id) => trainingIds.has(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- also recompute when prop changes
  }, [chapterId, trainingExercises, trainingCompletedIds]);

  return (
    <div className="min-w-0">
      {activeTab === "summary" ? (
        <QuestSummaryView
          summary={summary}
          chapterId={chapterId}
          isRead={summaryRead}
          onMarkRead={onMarkSummaryRead}
        />
      ) : null}

      {activeTab === "quick-revision" ? (
        <QuickRevisionView
          chapterId={chapterId}
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
          completedIds={liveExerciseCompletedIds}
          onMarkComplete={onMarkExerciseComplete}
          initialAiOpen={autoOpenAi}
          showSidebar={false}
          onPromptChange={onPromptChange}
        />
      ) : null}

      {activeTab === "quiz" ? (
        quiz ? (
          <QuizRunner
            quiz={quiz}
            subjectName={subjectName}
            chapterNumber={chapterNumber}
            chapterTitle={chapterTitle}
            challengeId={challengeId}
            onQuizComplete={onQuizComplete}
          />
        ) : (
          <EmptyState
            title="Quiz unavailable"
            description="This chapter does not have a quiz yet. Continue with summary and exercises."
          />
        )
      ) : null}

      {activeTab === "illustration" ? (
        <QuestIllustrationView
          exercises={illustrationExercises}
          completedIds={liveIllustrationCompletedIds}
          onMarkComplete={onMarkExerciseComplete}
        />
      ) : null}

      {/* Mobile-only floating AI button + bottom sheet drawer */}
      <MobileAiFab />
    </div>
  );
}

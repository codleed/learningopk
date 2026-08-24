"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { BookOpen, Dumbbell, HelpCircle, Atom, NotebookPen } from "lucide-react";

import type { ChapterDetailResponse } from "@/lib/learn-api";
import type { TabItem } from "@/components/foundation/tabs";
import { StaggerContainer, MotionSection } from "@/components/motion";
import { cn } from "@/lib/utils";
import { trackProgressEvent } from "@/lib/progress-client";

import { ChapterProvider, type ChapterContextValue } from "./chapter-context";
import type { ChapterTab } from "./chapter-context";
import { ChapterStudyContentWithAi } from "./chapter-study-content-with-ai";
import { AIUnifiedChat } from "@/components/ai/ai-unified-chat";
import type { AIContext } from "@/components/ai/ai-unified-chat/types";
import { useGamification } from "@/components/gamification/use-gamification";
import { useXpNotifications } from "@/components/gamification/use-xp-notifications";
import { useStreakTracking } from "@/components/gamification/use-streak-tracking";
import { XpToast } from "@/components/gamification/xp-toast";
import { ConfettiCelebration } from "@/components/gamification/confetti-celebration";
import { QuestHeader } from "./quest-header";
import { QuestTabBar } from "./quest-tab-bar";
import { getChapterProgress } from "@/lib/gamification-storage";

type ChapterStudyWorkspaceProps = {
  boardName: string;
  className: string;
  subjectName: string;
  boardSlug: string;
  classSlug: string;
  subjectSlug: string;
  chapterSlug: string;
  activeTab: ChapterTab;
  tabs: TabItem[];
  chapterId: number;
  chapterNumber: number;
  chapterTitle: string;
  chapterSummary: string;
  chapterSubparts: Array<{
    id: number;
    chapterId: number;
    orderIndex: number;
    heading: string;
    content: string;
  }>;
  chapterRevisionNotes: ChapterDetailResponse["chapter"]["revisionNotes"];
  exercises: ChapterDetailResponse["exercises"];
  quiz: ChapterDetailResponse["quiz"];
  autoOpenAi?: boolean;
  challengeId?: string;
};

const TAB_ICONS: Record<string, React.ReactNode> = {
  summary: <BookOpen className="h-4 w-4" />,
  "quick-revision": <NotebookPen className="h-4 w-4" />,
  exercises: <Dumbbell className="h-4 w-4" />,
  quiz: <HelpCircle className="h-4 w-4" />,
  illustration: <Atom className="h-4 w-4" />,
};

export function ChapterStudyWorkspace({
  boardName,
  className,
  subjectName,
  boardSlug,
  classSlug,
  subjectSlug,
  chapterSlug,
  activeTab,
  tabs,
  chapterId,
  chapterNumber,
  chapterTitle,
  chapterSummary,
  chapterSubparts,
  chapterRevisionNotes,
  exercises,
  quiz,
  autoOpenAi = false,
  challengeId,
}: ChapterStudyWorkspaceProps) {
  const [, setPrompt] = useState<string | null>(
    autoOpenAi ? "Guide me through this chapter using hints first." : null
  );

  const {
    state,
    xpQueue,
    dismissXpNotification,
    leveledUp,
    markSummaryRead,
    markSubpartRead,
    markExerciseComplete,
    completeQuiz,
  } = useGamification();
  const { streak } = useStreakTracking();
  const { visibleNotifications, dismiss } = useXpNotifications(xpQueue, dismissXpNotification);

  const readProgress = useCallback(() => getChapterProgress(String(chapterId)), [chapterId]);

  const [chapterProgress, setChapterProgress] = useState(readProgress);

  // Re-read gamification storage whenever tabs fire the custom
  // "chapter-progress-updated" event.
  useEffect(() => {
    const handler = () => setChapterProgress(readProgress());
    window.addEventListener("chapter-progress-updated", handler);
    return () => window.removeEventListener("chapter-progress-updated", handler);
  }, [readProgress]);

  /** Split exercises: non-numerical → Training, numerical → Illustration */
  const trainingExercises = useMemo(
    () => exercises?.filter((e) => e.type !== "numerical") ?? [],
    [exercises]
  );
  const illustrationExercises = useMemo(
    () => exercises?.filter((e) => e.type === "numerical") ?? [],
    [exercises]
  );

  /** Completed illustration exercise IDs (from gamification progress) */
  const illustrationCompletedIds = useMemo(() => {
    const completedAll = chapterProgress?.exercisesCompleted ?? [];
    const numericalIds = new Set(illustrationExercises.map((e) => e.id));
    return completedAll.filter((id) => numericalIds.has(id));
  }, [chapterProgress, illustrationExercises]);

  /** Completed training exercise IDs (from gamification progress) */
  const trainingCompletedIds = useMemo(() => {
    const completedAll = chapterProgress?.exercisesCompleted ?? [];
    const trainingIds = new Set(trainingExercises.map((e) => e.id));
    return completedAll.filter((id) => trainingIds.has(id));
  }, [chapterProgress, trainingExercises]);

  /** Handler: mark an exercise (training or illustration) as complete via gamification hook */
  const handleMarkExerciseComplete = useCallback(
    (exerciseId: number, difficulty: "easy" | "medium" | "hard") => {
      markExerciseComplete(String(chapterId), exerciseId, difficulty);
    },
    [chapterId, markExerciseComplete]
  );

  /** Handler: record quiz completion via gamification hook */
  const handleQuizComplete = useCallback(
    (score: number, percentage: number) => {
      completeQuiz(String(chapterId), score, percentage);
    },
    [chapterId, completeQuiz]
  );

  /** Handler: mark summary as read via gamification + backend tracking */
  const handleMarkSummaryRead = useCallback(
    (subpartId?: number) => {
      // For individual subparts: track backend progress + update localStorage
      if (typeof subpartId === "number") {
        const totalSubparts = chapterSubparts.length;
        const result = markSubpartRead(String(chapterId), subpartId, totalSubparts);
        if (result.summaryRead) {
          markSummaryRead(String(chapterId));
        }
      } else {
        // Only mark summary as read when explicitly completing the summary
        markSummaryRead(String(chapterId));
      }
      void trackProgressEvent(
        typeof subpartId === "number"
          ? { eventType: "subpart_read", chapterId, subpartId }
          : { eventType: "summary_read", chapterId }
      );
    },
    [chapterId, chapterSubparts.length, markSummaryRead, markSubpartRead]
  );

  /** XP earned in this chapter */
  const chapterXp = chapterProgress?.xpEarned ?? 0;

  /** Granular completion: each active category gets equal weight,
   *  with proportional progress within that category. Categories
   *  with no content are excluded so 100% is always reachable. */
  const completionPercent = useMemo(() => {
    type Category = { progress: number };
    const categories: Category[] = [];

    // Summary — boolean (always present)
    categories.push({
      progress: chapterProgress?.summaryRead ? 1 : 0,
    });

    // Training exercises — proportional
    if (trainingExercises.length > 0) {
      categories.push({
        progress: trainingCompletedIds.length / trainingExercises.length,
      });
    }

    // Quiz — boolean
    if (quiz != null) {
      categories.push({
        progress: (chapterProgress?.quizAttempts?.length ?? 0) > 0 ? 1 : 0,
      });
    }

    // Illustration exercises — proportional
    if (illustrationExercises.length > 0) {
      categories.push({
        progress: illustrationCompletedIds.length / illustrationExercises.length,
      });
    }

    if (categories.length === 0) return 0;

    const weight = 100 / categories.length;
    return categories.reduce((sum, c) => sum + c.progress * weight, 0);
  }, [
    chapterProgress,
    trainingExercises,
    trainingCompletedIds,
    illustrationExercises,
    illustrationCompletedIds,
    quiz,
  ]);

  const aiContext: AIContext | null = {
    chapterId,
    chapterTitle,
    chapterNumber,
    subjectName,
    boardName,
    className,
    currentTab: activeTab,
  };

  const chapterContextValue: ChapterContextValue = {
    boardSlug,
    classSlug,
    subjectSlug,
    chapterSlug,
    activeTab,
    boardName,
    className,
    subjectName,
    chapterTitle,
    chapterNumber,
    chapterId,
    chapterSummary,
    chapterSubparts,
    chapterRevisionNotes,
    exercises,
    quiz,
    autoOpenAi,
    challengeId,
  };

  return (
    <ChapterProvider value={chapterContextValue}>
      <XpToast notifications={visibleNotifications} onDismiss={dismiss} />
      <ConfettiCelebration show={leveledUp} onComplete={() => {}} />

      <StaggerContainer
        className={cn(
          "grid gap-4 lg:gap-5 lg:items-start",
          "lg:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]"
        )}
      >
        {/* Main content column */}
        <MotionSection>
          <div className="space-y-4">
            {/* Quest header */}
            <QuestHeader
              gamificationState={state}
              streak={streak}
              completionPercent={completionPercent}
              chapterXp={chapterXp}
            />

            {/* Tab bar */}
            <div className="rounded-xl border border-border-default bg-bg-surface p-1">
              <QuestTabBar
                status={{
                  summary: chapterProgress?.summaryRead ?? false,
                  quickRevision:
                    chapterRevisionNotes.keyFormulas.length > 0 ||
                    chapterRevisionNotes.keyDefinitions.length > 0 ||
                    chapterRevisionNotes.commonMistakes.trim().length > 0 ||
                    chapterRevisionNotes.examTips.trim().length > 0,
                  exercises: trainingCompletedIds.length,
                  totalExercises: trainingExercises.length,
                  quizCompleted: (chapterProgress?.quizAttempts?.length ?? 0) > 0,
                  illustrations: illustrationCompletedIds.length,
                  totalIllustrations: illustrationExercises.length,
                }}
              />
            </div>

            {/* Study content */}
            <div
              className={cn(
                "rounded-xl border border-border-default bg-bg-surface",
                "p-3 sm:p-5",
                "min-h-[200px] sm:min-h-[300px] lg:min-h-[400px]"
              )}
            >
              <div className="mb-4 flex items-center gap-2 border-b border-border-default pb-3">
                <span className="text-text-secondary">{TAB_ICONS[activeTab]}</span>
                <h2 className="font-[var(--font-display)] text-lg font-semibold text-text-primary">
                  {tabs.find((t) => t.key === activeTab)?.label || "Study Content"}
                </h2>
              </div>

              <ChapterStudyContentWithAi
                trainingExercises={trainingExercises}
                illustrationExercises={illustrationExercises}
                illustrationCompletedIds={illustrationCompletedIds}
                trainingCompletedIds={trainingCompletedIds}
                summaryRead={chapterProgress?.summaryRead ?? false}
                onMarkSummaryRead={handleMarkSummaryRead}
                onMarkExerciseComplete={handleMarkExerciseComplete}
                onQuizComplete={handleQuizComplete}
                onPromptChange={(nextPrompt) => {
                  setPrompt(nextPrompt);
                }}
              />
            </div>
          </div>
        </MotionSection>

        {/* AI sidebar */}
        <MotionSection>
          <div className="min-w-0">
            <AIUnifiedChat context={aiContext} />
          </div>
        </MotionSection>
      </StaggerContainer>
    </ChapterProvider>
  );
}

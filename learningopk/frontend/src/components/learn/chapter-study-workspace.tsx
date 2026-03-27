"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { ChevronLeft, BookOpen, Dumbbell, Layers, HelpCircle } from "lucide-react";

import type { ChapterDetailResponse } from "@/lib/learn-api";
import {
  DashboardSection,
  DashboardSurface,
} from "@/components/foundation/dashboard-primitives";
import {
  StaggerContainer,
  MotionSection,
} from "@/components/dashboard/DashboardClient";
import { Tabs, type TabItem } from "@/components/foundation/tabs";
import { cn } from "@/lib/utils";

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

type ChapterTab = "summary" | "exercises" | "flashcards" | "quiz";

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
  exercises: ChapterDetailResponse["exercises"];
  flashcards: ChapterDetailResponse["flashcards"];
  quiz: ChapterDetailResponse["quiz"];
  flashcardStorageKey: string;
  autoOpenAi?: boolean;
};

const TAB_ICONS: Record<string, React.ReactNode> = {
  summary: <BookOpen className="h-4 w-4" />,
  exercises: <Dumbbell className="h-4 w-4" />,
  flashcards: <Layers className="h-4 w-4" />,
  quiz: <HelpCircle className="h-4 w-4" />,
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
  exercises,
  flashcards,
  quiz,
  flashcardStorageKey,
  autoOpenAi = false,
}: ChapterStudyWorkspaceProps) {
  const [prompt, setPrompt] = useState<string | null>(
    autoOpenAi ? "Guide me through this chapter using hints first." : null,
  );

  const { state, xpQueue, dismissXpNotification, leveledUp } = useGamification();
  const { streak } = useStreakTracking();
  const { visibleNotifications, dismiss } = useXpNotifications(xpQueue, dismissXpNotification);

  const chapterProgress = useMemo(() => {
    return getChapterProgress(String(chapterId));
  }, [chapterId]);

  const completionPercent = useMemo(() => {
    const parts = 4;
    let completed = 0;
    if (chapterProgress?.summaryRead) completed++;
    if ((chapterProgress?.exercisesCompleted?.length ?? 0) > 0) completed++;
    if (Object.keys(chapterProgress?.flashcardsReviewed ?? {}).length > 0) completed++;
    if ((chapterProgress?.quizAttempts?.length ?? 0) > 0) completed++;
    return (completed / parts) * 100;
  }, [chapterProgress]);

  const aiContext: AIContext | null = {
    chapterId,
    chapterTitle,
    chapterNumber,
    subjectName,
    boardName,
    className,
    currentTab: activeTab,
  };

  return (
    <>
      <XpToast notifications={visibleNotifications} onDismiss={dismiss} />
      <ConfettiCelebration show={leveledUp} onComplete={() => {}} />
      <StaggerContainer
        className={cn(
          "grid gap-5 xl:items-start",
          "xl:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)]"
        )}
      >
        <MotionSection>
          <DashboardSurface
            as="section"
            tone="shell"
            className="overflow-visible space-y-5 p-4 sm:p-6"
          >
            <MotionSection>
              <QuestHeader
                boardName={boardName}
                boardSlug={boardSlug}
                classSlug={classSlug}
                subjectName={subjectName}
                subjectSlug={subjectSlug}
                chapterNumber={chapterNumber}
                chapterTitle={chapterTitle}
                gamificationState={state}
                streak={streak}
                completionPercent={completionPercent}
              />
            </MotionSection>

            <MotionSection>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <DashboardSurface 
                  as="div" 
                  tone="header" 
                  className="flex-1 px-1.5 py-1.5"
                >
                  <QuestTabBar
                    activeTab={activeTab}
                    baseHref={`/${boardSlug}/${classSlug}/${subjectSlug}/${chapterSlug}`}
                    status={{
                      summary: chapterProgress?.summaryRead ?? false,
                      exercises: chapterProgress?.exercisesCompleted?.length ?? 0,
                      totalExercises: exercises?.length ?? 0,
                      flashcards: Object.keys(chapterProgress?.flashcardsReviewed ?? {}).length,
                      totalFlashcards: flashcards?.length ?? 0,
                      quizCompleted: (chapterProgress?.quizAttempts?.length ?? 0) > 0,
                    }}
                  />
                </DashboardSurface>
              </div>
            </MotionSection>

            <MotionSection>
              <DashboardSection 
                title={tabs.find(t => t.key === activeTab)?.label || 'Study Content'}
                className="min-h-[400px]"
              >
                <ChapterStudyContentWithAi
                  activeTab={activeTab}
                  chapterId={chapterId}
                  chapterTitle={chapterTitle}
                  chapterNumber={chapterNumber}
                  summary={chapterSummary}
                  subjectName={subjectName}
                  exercises={exercises}
                  flashcards={flashcards}
                  quiz={quiz}
                  flashcardStorageKey={flashcardStorageKey}
                  autoOpenAi={autoOpenAi}
                  onPromptChange={(nextPrompt) => {
                    setPrompt(nextPrompt);
                  }}
                />
              </DashboardSection>
            </MotionSection>
          </DashboardSurface>
        </MotionSection>

        <MotionSection>
          <AIUnifiedChat context={aiContext} />
        </MotionSection>
    </StaggerContainer>
    </>
  );
}

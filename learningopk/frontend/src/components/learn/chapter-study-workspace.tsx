"use client";

import Link from "next/link";
import { useState } from "react";

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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";


import { ChapterStudyContentWithAi } from "./chapter-study-content-with-ai";
import { AIUnifiedChat } from "@/components/ai/ai-unified-chat";
import type { AIContext } from "@/components/ai/ai-unified-chat/types";

type ChapterTab = "summary" | "exercises" | "flashcards" | "quiz";

type ChapterStudyWorkspaceProps = {
  boardName: string;
  className: string;
  subjectName: string;
  boardSlug: string;
  classSlug: string;
  subjectSlug: string;
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

export function ChapterStudyWorkspace({
  boardName,
  className,
  subjectName,
  boardSlug,
  classSlug,
  subjectSlug,
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
  const [isAiSidebarHidden, setIsAiSidebarHidden] = useState(false);
  const useSingleColumnLayout = isAiSidebarHidden;

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
    <StaggerContainer
      className={cn(
        "grid gap-4 xl:items-start",
        useSingleColumnLayout
          ? "xl:grid-cols-[minmax(0,1fr)]"
          : "xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]",
      )}
    >
        <MotionSection>
          <DashboardSurface
            as="section"
            tone="shell"
            className="overflow-visible space-y-4 p-4 sm:p-5"
          >
            <MotionSection>
              <DashboardSurface
                as="header"
                tone="hero"
                className="px-5 py-6 sm:px-7"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  {boardName} | Class {className} | {subjectName}
                </p>
                <h1 className="mt-2 text-3xl font-medium text-foreground sm:text-4xl">
                  Chapter {chapterNumber}: {chapterTitle}
                </h1>
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                  Switch tabs to study summary, solve exercises with AI
                  guidance, revise flashcards, and attempt quiz.
                </p>
                <Link
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)] underline underline-offset-4"
                  href={`/${boardSlug}/${classSlug}/${subjectSlug}`}
                >
                  ← Back to subject
                </Link>
              </DashboardSurface>
            </MotionSection>

            <MotionSection>
              <DashboardSurface as="div" tone="header" className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Tabs
                    activeKey={activeTab}
                    items={tabs}
                    ariaLabel="Chapter study tabs"
                  />
                  {isAiSidebarHidden ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setIsAiSidebarHidden(false);
                      }}
                    >
                      Show AI Tutor
                    </Button>
                  ) : null}
                </div>
              </DashboardSurface>
            </MotionSection>

            <MotionSection>
              <DashboardSection title="Study Content">
                <ChapterStudyContentWithAi
                  activeTab={activeTab}
                  chapterId={chapterId}
                  chapterTitle={chapterTitle}
                  summary={chapterSummary}
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

        {!isAiSidebarHidden ? (
          <MotionSection>
            <div className="xl:sticky xl:top-4 xl:self-start">
              <AIUnifiedChat context={aiContext} />
            </div>
          </MotionSection>
        ) : null}
    </StaggerContainer>
  );
}

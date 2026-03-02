"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { ChapterDetailResponse } from "@/lib/learn-api";
import { DashboardSection, DashboardSurface } from "@/components/foundation/dashboard-primitives";
import { Tabs, type TabItem } from "@/components/foundation/tabs";

import { AIChatPanel } from "./ai-chat-panel";
import { ChapterStudyContentWithAi } from "./chapter-study-content-with-ai";

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
  autoOpenAi = false
}: ChapterStudyWorkspaceProps) {
  const [prompt, setPrompt] = useState<string | null>(autoOpenAi ? "Guide me through this chapter using hints first." : null);
  const panelPrompt = useMemo(() => prompt ?? undefined, [prompt]);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)] xl:items-start">
      <DashboardSurface as="section" tone="shell" className="overflow-visible space-y-4 p-4 sm:p-5">
        <DashboardSurface as="header" tone="hero" className="px-5 py-6 sm:px-7">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-primary">
            {boardName} | Class {className} | {subjectName}
          </p>
          <h1 className="mt-2 text-3xl font-medium text-foreground sm:text-4xl">
            Chapter {chapterNumber}: {chapterTitle}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Switch tabs to study summary, solve exercises with AI guidance, revise flashcards, and attempt quiz.
          </p>
          <Link
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary underline underline-offset-4"
            href={`/${boardSlug}/${classSlug}/${subjectSlug}`}
          >
            Back to subject
          </Link>
        </DashboardSurface>

        <DashboardSurface as="div" tone="header" className="px-4 py-3">
          <Tabs activeKey={activeTab} items={tabs} ariaLabel="Chapter study tabs" />
        </DashboardSurface>

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
      </DashboardSurface>

      <div className="xl:sticky xl:top-4 xl:self-start">
        <AIChatPanel chapterId={chapterId} chapterTitle={chapterTitle} initialPrompt={panelPrompt} layout="sidebar" />
      </div>
    </div>
  );
}

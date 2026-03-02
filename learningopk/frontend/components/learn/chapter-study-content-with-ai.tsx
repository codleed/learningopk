"use client";

import { useMemo, useState } from "react";

import type { ChapterDetailResponse } from "@/lib/learn-api";
import { EmptyState } from "@/components/ui/states";

import { AIChatPanel } from "./ai-chat-panel";
import { ChapterExercisesWithAi } from "./chapter-exercises-with-ai";
import { FlashcardDeck } from "./flashcard-deck";
import { MarkdownMathRenderer } from "./markdown-math-renderer";
import { QuizRunner } from "./quiz-runner";

type ChapterTab = "summary" | "exercises" | "flashcards" | "quiz";

type ChapterStudyContentWithAiProps = {
  activeTab: ChapterTab;
  chapterId: number;
  chapterTitle: string;
  summary: string;
  exercises: ChapterDetailResponse["exercises"];
  flashcards: ChapterDetailResponse["flashcards"];
  quiz: ChapterDetailResponse["quiz"];
  flashcardStorageKey: string;
  autoOpenAi?: boolean;
};

export function ChapterStudyContentWithAi({
  activeTab,
  chapterId,
  chapterTitle,
  summary,
  exercises,
  flashcards,
  quiz,
  flashcardStorageKey,
  autoOpenAi = false
}: ChapterStudyContentWithAiProps) {
  const [prompt, setPrompt] = useState<string | null>(autoOpenAi ? "Guide me through this chapter using hints first." : null);
  const panelPrompt = useMemo(() => prompt ?? undefined, [prompt]);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)] xl:items-start">
      <div className="min-w-0">
        {activeTab === "summary" ? <MarkdownMathRenderer content={summary} /> : null}

        {activeTab === "exercises" ? (
          <ChapterExercisesWithAi
            chapterId={chapterId}
            chapterTitle={chapterTitle}
            exercises={exercises}
            initialAiOpen={autoOpenAi}
            showSidebar={false}
            onPromptChange={(nextPrompt) => {
              setPrompt(nextPrompt);
            }}
          />
        ) : null}

        {activeTab === "flashcards" ? (
          <FlashcardDeck chapterId={chapterId} flashcards={flashcards} storageKey={flashcardStorageKey} />
        ) : null}

        {activeTab === "quiz" ? (
          quiz ? (
            <QuizRunner quiz={quiz} />
          ) : (
            <EmptyState
              title="Quiz unavailable"
              description="This chapter does not have a quiz yet. Continue with summary, exercises, and flashcards."
            />
          )
        ) : null}
      </div>

      <div className="xl:sticky xl:top-4 xl:self-start">
        <AIChatPanel chapterId={chapterId} chapterTitle={chapterTitle} initialPrompt={panelPrompt} layout="sidebar" />
      </div>
    </div>
  );
}

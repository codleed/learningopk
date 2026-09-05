"use client";

import { useMemo, useState } from "react";

import type { ChapterDetailResponse } from "@/lib/learn-api";
import { trackProgressEvent } from "@/lib/progress-client";

import { AIChatPanel } from "./ai-chat-panel";
import { ExerciseAccordion } from "./exercise-accordion";

type ChapterExercisesWithAiProps = {
  chapterId: number;
  chapterTitle: string;
  exercises: ChapterDetailResponse["exercises"];
  completedIds: number[];
  onMarkComplete: (exerciseId: number, difficulty: "easy" | "medium" | "hard") => void;
  initialAiOpen?: boolean;
  showSidebar?: boolean;
  onPromptChange?: (prompt: string) => void;
};

export function ChapterExercisesWithAi({
  chapterId,
  chapterTitle,
  exercises,
  completedIds,
  onMarkComplete,
  initialAiOpen = false,
  showSidebar = true,
  onPromptChange,
}: ChapterExercisesWithAiProps) {
  const [prompt, setPrompt] = useState<string | null>(
    initialAiOpen ? "Guide me through solving the first exercise using hints first." : null
  );

  const onExerciseExpanded = (nextChapterId: number) => {
    void trackProgressEvent({
      eventType: "exercise_view",
      chapterId: nextChapterId,
    });
  };

  const emptyAwarePrompt = useMemo(() => prompt ?? undefined, [prompt]);
  const pushPrompt = (nextPrompt: string) => {
    onPromptChange?.(nextPrompt);
    setPrompt(nextPrompt);
  };

  // Suppress unused lint for pushPrompt (kept for future use)
  void pushPrompt;

  const exercisesContent = (
    <div className="space-y-4">
      <ExerciseAccordion
        exercises={exercises}
        completedIds={completedIds}
        onMarkComplete={onMarkComplete}
        chapterId={chapterId}
        onExerciseExpanded={onExerciseExpanded}
      />
    </div>
  );

  if (!showSidebar) {
    return exercisesContent;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)] xl:items-start">
      {exercisesContent}

      <div className="xl:sticky xl:top-4 xl:self-start">
        <AIChatPanel
          chapterId={chapterId}
          chapterTitle={chapterTitle}
          initialPrompt={emptyAwarePrompt}
          layout="sidebar"
        />
      </div>
    </div>
  );
}

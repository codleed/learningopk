"use client";

import { useMemo, useState } from "react";

import type { ChapterDetailResponse } from "@/lib/learn-api";
import { trackProgressEvent } from "@/lib/progress-client";
import { Button } from "@/components/ui/button";

import { AIChatPanel } from "./ai-chat-panel";
import { ExerciseAccordion } from "./exercise-accordion";

type Exercise = ChapterDetailResponse["exercises"][number];

type ChapterExercisesWithAiProps = {
  chapterId: number;
  chapterTitle: string;
  exercises: Exercise[];
  initialAiOpen?: boolean;
};

const buildExercisePrompt = (exercise: Exercise): string =>
  `Guide me through Exercise ${exercise.exerciseNumber}: ${exercise.question}\n\nPlease use hints first.`;

export function ChapterExercisesWithAi({
  chapterId,
  chapterTitle,
  exercises,
  initialAiOpen = false
}: ChapterExercisesWithAiProps) {
  const [prompt, setPrompt] = useState<string | null>(
    initialAiOpen ? "Guide me through solving the first exercise using hints first." : null
  );

  const onExerciseExpanded = (nextChapterId: number) => {
    void trackProgressEvent({
      eventType: "exercise_view",
      chapterId: nextChapterId
    });
  };

  const emptyAwarePrompt = useMemo(() => prompt ?? undefined, [prompt]);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)] xl:items-start">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/45 p-4">
          <div>
            <p className="text-sm font-semibold text-foreground">AI Tutor Sidebar</p>
            <p className="text-sm text-muted-foreground">
              AI is docked on the right side. Expand any exercise to send a guided prompt to the tutor.
            </p>
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => {
              setPrompt("Guide me through solving the first exercise using hints first.");
            }}
          >
            Open AI Tutor
          </Button>
        </div>

        <ExerciseAccordion
          exercises={exercises}
          chapterId={chapterId}
          onExerciseExpanded={onExerciseExpanded}
          onAskAi={(exercise) => {
            setPrompt(buildExercisePrompt(exercise));
          }}
        />
      </div>

      <div className="xl:sticky xl:top-4 xl:self-start">
        <AIChatPanel chapterId={chapterId} chapterTitle={chapterTitle} initialPrompt={emptyAwarePrompt} layout="sidebar" />
      </div>
    </div>
  );
}

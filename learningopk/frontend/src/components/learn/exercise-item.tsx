"use client";

import { CheckCircle2, ChevronDown } from "lucide-react";

import type { ChapterDetailResponse } from "@/lib/learn-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ContentRenderer } from "@/components/common/content-renderer";
import { cn } from "@/lib/utils";

import { ExerciseSolutionPanel } from "./exercise-solution-panel";

type Exercise = ChapterDetailResponse["exercises"][number];

type ExerciseItemProps = {
  exercise: Exercise;
  isCompleted: boolean;
  onMarkComplete: (exerciseId: number, difficulty: "easy" | "medium" | "hard") => void;
  onExpanded: () => void;
};

const difficultyConfig = {
  easy: { variant: "success" as const, label: "Easy" },
  medium: { variant: "warning" as const, label: "Medium" },
  hard: { variant: "danger" as const, label: "Hard" },
} as const;

const typeConfig = {
  mcq: { label: "MCQ", variant: "primary" as const },
  short: { label: "Short", variant: "info" as const },
  long: { label: "Long", variant: "default" as const },
  numerical: { label: "Numerical", variant: "outline" as const },
  fill_in_blanks: { label: "Fill in Blanks", variant: "info" as const },
} as const;

export function ExerciseItem({ exercise, isCompleted, onMarkComplete, onExpanded }: ExerciseItemProps) {
  const difficulty = difficultyConfig[exercise.difficulty] ?? difficultyConfig.easy;
  const exerciseType = typeConfig[exercise.type] ?? typeConfig.short;

  return (
    <details
      className={cn(
        "group/details rounded-xl border border-border-default bg-bg-surface",
        "transition-all duration-200",
        "open:border-accent-primary/25 open:shadow-[var(--shadow-sm)]",
        "hover:border-border-strong"
      )}
      onToggle={(event) => {
        if (event.currentTarget.open) {
          onExpanded();
        }
      }}
    >
      <summary
        className={cn(
          "flex cursor-pointer list-none items-start gap-3 p-4 sm:p-5",
          "select-none",
          "[&::-webkit-details-marker]:hidden"
        )}
      >
        {/* Exercise number badge */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-subtle font-[var(--font-mono)] text-xs font-bold text-text-secondary">
          {exercise.exerciseNumber}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Meta row */}
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <Badge variant={exerciseType.variant} size="sm">
              {exerciseType.label}
            </Badge>
            <Badge variant={difficulty.variant} size="sm">
              {difficulty.label}
            </Badge>
          </div>

          {/* Question preview */}
          <div className="text-sm leading-relaxed text-text-primary sm:text-base">
            <ContentRenderer
              content={exercise.question}
              variant="compact"
              enableMath
              enableCode={false}
            />
          </div>
        </div>

        {/* Mark complete pill */}
        {isCompleted ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-accent-success px-2.5 py-1 text-[0.625rem] font-semibold text-white">
            <CheckCircle2 className="h-3 w-3" />
            Solved
          </span>
        ) : (
          <Button
            size="xs"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              onMarkComplete(exercise.id, exercise.difficulty);
            }}
          >
            Mark Solved
          </Button>
        )}

        {/* Expand indicator */}
        <ChevronDown
          className={cn(
            "mt-1 h-4 w-4 shrink-0 text-text-muted",
            "transition-transform duration-200",
            "group-open/details:rotate-180 group-open/details:text-accent-primary"
          )}
          aria-hidden
        />
      </summary>

      {/* Solution panel */}
      <ExerciseSolutionPanel solution={exercise.solution} />
    </details>
  );
}

"use client";

import { CheckCircle2, ChevronDown } from "lucide-react";

import type { ChapterDetailResponse } from "@/lib/learn-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ContentRenderer } from "@/components/common/content-renderer";
import { cn } from "@/lib/utils";

import { ExerciseSolutionPanel } from "./exercise-solution-panel";
import { FillInBlanksRenderer } from "./fill-in-blanks-renderer";

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

export function ExerciseItem({
  exercise,
  isCompleted,
  onMarkComplete,
  onExpanded,
}: ExerciseItemProps) {
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
          "flex cursor-pointer list-none items-start gap-2 sm:gap-3 p-3 sm:p-4",
          "select-none",
          "[&::-webkit-details-marker]:hidden"
        )}
      >
        {/* Exercise number badge */}
        <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-bg-subtle font-[var(--font-mono)] text-xs font-bold text-text-secondary">
          {exercise.exerciseNumber}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Meta row */}
          <div className="mb-1.5 sm:mb-2 flex flex-wrap items-center gap-1.5">
            <Badge variant={exerciseType.variant} size="sm">
              {exerciseType.label}
            </Badge>
            <Badge variant={difficulty.variant} size="sm">
              {difficulty.label}
            </Badge>
          </div>

          {/* Question preview */}
          <div
            className="text-sm leading-relaxed text-text-primary"
            onClick={(e) => e.stopPropagation()}
          >
            {exercise.type === "fill_in_blanks" ? (
              <FillInBlanksRenderer
                question={exercise.question}
                blanksAnswer={exercise.blanksAnswer}
                statements={exercise.statements}
                onComplete={() => onMarkComplete(exercise.id, exercise.difficulty)}
              />
            ) : (
              <ContentRenderer
                content={exercise.question}
                variant="compact"
                enableMath
                enableCode={false}
              />
            )}
          </div>
        </div>

        {/* Mark complete pill + expand indicator */}
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {isCompleted ? (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-accent-success px-2 py-0.5 sm:px-2.5 sm:py-1 text-[0.625rem] font-semibold text-white">
              <CheckCircle2 className="h-3 w-3" />
              <span className="hidden sm:inline">Solved</span>
            </span>
          ) : (
            <Button
              size="xs"
              variant="secondary"
              className="hidden sm:inline-flex"
              onClick={(e) => {
                e.stopPropagation();
                onMarkComplete(exercise.id, exercise.difficulty);
              }}
            >
              Mark Solved
            </Button>
          )}

          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-text-muted",
              "transition-transform duration-200",
              "group-open/details:rotate-180 group-open/details:text-accent-primary"
            )}
            aria-hidden
          />
        </div>
      </summary>

      {/* Solution panel */}
      <ExerciseSolutionPanel solution={exercise.solution} />

      {/* Mobile-only mark solved button inside details */}
      {!isCompleted && (
        <div className="sm:hidden px-3 pb-3">
          <Button
            size="sm"
            variant="secondary"
            width="full"
            onClick={(e) => {
              e.stopPropagation();
              onMarkComplete(exercise.id, exercise.difficulty);
            }}
          >
            Mark Solved
          </Button>
        </div>
      )}
    </details>
  );
}

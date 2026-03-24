import type { ChapterDetailResponse } from "@/lib/learn-api";

import { Badge } from "@/components/ui/badge";

import { ExerciseSolutionPanel } from "./exercise-solution-panel";

type Exercise = ChapterDetailResponse["exercises"][number];

type ExerciseItemProps = {
  exercise: Exercise;
  onExpanded: () => void;
  onAskAi: () => void;
};

export function ExerciseItem({ exercise, onExpanded, onAskAi }: ExerciseItemProps) {
  return (
    <details
      className="group rounded-xl border border-border bg-card p-4 open:border-[var(--primary)]/45 open:shadow-[var(--elevation-soft)]"
      onToggle={(event) => {
        if (event.currentTarget.open) {
          onExpanded();
        }
      }}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">Exercise {exercise.exerciseNumber}</p>
          <p className="mt-1 font-medium text-foreground">{exercise.question}</p>
        </div>
        <Badge variant={exercise.difficulty === "hard" ? "warning" : exercise.difficulty === "medium" ? "info" : "success"}>
          {exercise.difficulty}
        </Badge>
      </summary>

      <ExerciseSolutionPanel solution={exercise.solution} onAskAi={onAskAi} />
    </details>
  );
}


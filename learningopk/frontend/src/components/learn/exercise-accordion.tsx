import type { ChapterDetailResponse } from "@/lib/learn-api";

import { EmptyState } from "@/components/ui/states";

import { ExerciseItem } from "./exercise-item";

type Exercise = ChapterDetailResponse["exercises"][number];

type ExerciseAccordionProps = {
  exercises: Exercise[];
  onExerciseExpanded: (chapterId: number) => void;
  chapterId: number;
  onAskAi: (exercise: Exercise) => void;
};

export function ExerciseAccordion({ exercises, onExerciseExpanded, chapterId, onAskAi }: ExerciseAccordionProps) {
  if (exercises.length === 0) {
    return (
      <EmptyState
        title="No exercises yet"
        description="This chapter has no exercise set right now. Check summary and quiz tabs in the meantime."
      />
    );
  }

  return (
    <div className="space-y-4">
      {exercises.map((exercise) => (
        <ExerciseItem
          key={exercise.id}
          exercise={exercise}
          onExpanded={() => onExerciseExpanded(chapterId)}
          onAskAi={() => onAskAi(exercise)}
        />
      ))}
    </div>
  );
}


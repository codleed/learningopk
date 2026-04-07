"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ListChecks } from "lucide-react";

import type { ChapterDetailResponse } from "@/lib/learn-api";
import { EmptyState } from "@/components/ui/states";

import { ExerciseItem } from "./exercise-item";

type Exercise = ChapterDetailResponse["exercises"][number];

type ExerciseAccordionProps = {
  exercises: Exercise[];
  completedIds: number[];
  onMarkComplete: (exerciseId: number, difficulty: "easy" | "medium" | "hard") => void;
  onExerciseExpanded: (chapterId: number) => void;
  chapterId: number;
};

export function ExerciseAccordion({
  exercises,
  completedIds,
  onMarkComplete,
  onExerciseExpanded,
  chapterId,
}: ExerciseAccordionProps) {
  const reduced = useReducedMotion();

  if (exercises.length === 0) {
    return (
      <EmptyState
        title="No exercises yet"
        description="This chapter has no exercise set right now. Check summary and quiz tabs in the meantime."
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Exercise count header */}
      <motion.div
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={reduced ? { duration: 0 } : undefined}
        className="flex items-center gap-2 pb-1"
      >
        <ListChecks className="h-4 w-4 text-accent-primary" aria-hidden />
        <span className="font-[var(--font-mono)] text-xs font-medium uppercase tracking-[0.08em] text-text-secondary">
          {exercises.length} {exercises.length === 1 ? "exercise" : "exercises"}
        </span>
      </motion.div>

      {/* Exercise items */}
      {exercises.map((exercise, index) => (
        <motion.div
          key={exercise.id}
          initial={reduced ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            reduced
              ? { duration: 0 }
              : {
                  delay: Math.min(index * 0.03, 0.3),
                  duration: 0.3,
                  ease: [0.23, 1, 0.32, 1],
                }
          }
        >
          <ExerciseItem
            exercise={exercise}
            isCompleted={completedIds.includes(exercise.id)}
            onMarkComplete={onMarkComplete}
            onExpanded={() => onExerciseExpanded(chapterId)}
          />
        </motion.div>
      ))}
    </div>
  );
}

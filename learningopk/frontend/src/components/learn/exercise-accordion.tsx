"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ListChecks, ArrowUp, ArrowDown } from "lucide-react";

import type { ChapterDetailResponse } from "@/lib/learn-api";
import { EmptyState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";

import { ExerciseItem } from "./exercise-item";

type Exercise = ChapterDetailResponse["exercises"][number];

type ExerciseAccordionProps = {
  exercises: Exercise[];
  completedIds: number[];
  onMarkComplete: (exerciseId: number, difficulty: "easy" | "medium" | "hard") => void;
  onExerciseExpanded: (chapterId: number) => void;
  chapterId: number;
};

const STORAGE_KEY = (chapterId: number) => `exercise-order-${chapterId}`;

export function ExerciseAccordion({
  exercises,
  completedIds,
  onMarkComplete,
  onExerciseExpanded,
  chapterId,
}: ExerciseAccordionProps) {
  const reduced = useReducedMotion();
  const [orderOverride, setOrderOverride] = useState<number[] | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY(chapterId));
      if (raw) {
        const parsed = JSON.parse(raw) as number[];
        const allIds = new Set(exercises.map((e) => e.id));
        if (parsed.length === exercises.length && parsed.every((id) => allIds.has(id))) {
          return parsed;
        }
      }
    } catch { /* ignore */ }
    return null;
  });

  const orderedExercises = useMemo(() => {
    if (!orderOverride || orderOverride.length !== exercises.length) return exercises;
    const map = new Map(exercises.map((e) => [e.id, e]));
    return orderOverride.map((id) => map.get(id)!).filter(Boolean);
  }, [exercises, orderOverride]);

  const saveOrder = useCallback((newOrder: number[]) => {
    setOrderOverride(newOrder);
    localStorage.setItem(STORAGE_KEY(chapterId), JSON.stringify(newOrder));
  }, [chapterId]);

  const moveUp = useCallback((index: number) => {
    if (index <= 0) return;
    const ids = orderedExercises.map((e) => e.id);
    const newIds = [...ids];
    [newIds[index], newIds[index - 1]] = [newIds[index - 1], newIds[index]];
    saveOrder(newIds);
  }, [orderedExercises, saveOrder]);

  const moveDown = useCallback((index: number) => {
    if (index >= orderedExercises.length - 1) return;
    const ids = orderedExercises.map((e) => e.id);
    const newIds = [...ids];
    [newIds[index], newIds[index + 1]] = [newIds[index + 1], newIds[index]];
    saveOrder(newIds);
  }, [orderedExercises, saveOrder]);

  const resetOrder = useCallback(() => {
    setOrderOverride(null);
    localStorage.removeItem(STORAGE_KEY(chapterId));
  }, [chapterId]);

  const hasCustomOrder = orderOverride !== null;

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
      {/* Header with reorder controls */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-1">
        <motion.div
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={reduced ? { duration: 0 } : undefined}
          className="flex items-center gap-2"
        >
          <ListChecks className="h-4 w-4 text-accent-primary" aria-hidden />
          <span className="font-[var(--font-mono)] text-xs font-medium uppercase tracking-[0.08em] text-text-secondary">
            {exercises.length} {exercises.length === 1 ? "exercise" : "exercises"}
          </span>
          {hasCustomOrder && (
            <span className="text-[10px] text-text-muted">(custom order)</span>
          )}
        </motion.div>
        {hasCustomOrder && (
          <Button variant="ghost" size="sm" onClick={resetOrder}>
            Reset order
          </Button>
        )}
      </div>

      {/* Exercise items with reorder controls */}
      {orderedExercises.map((exercise, index) => (
        <motion.div
          key={exercise.id}
          layout
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
          className="flex items-start gap-1.5 sm:gap-2"
        >
          {/* Reorder controls */}
          <div className="flex shrink-0 flex-col items-center gap-0.5 pt-1">
            <button
              onClick={() => moveUp(index)}
              disabled={index === 0}
              className="flex h-6 w-6 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-subtle hover:text-text-primary disabled:opacity-30"
              aria-label="Move exercise up"
            >
              <ArrowUp className="h-3 w-3" />
            </button>
            <button
              onClick={() => moveDown(index)}
              disabled={index === orderedExercises.length - 1}
              className="flex h-6 w-6 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-subtle hover:text-text-primary disabled:opacity-30"
              aria-label="Move exercise down"
            >
              <ArrowDown className="h-3 w-3" />
            </button>
          </div>

          <div className="min-w-0 flex-1">
            <ExerciseItem
              exercise={exercise}
              isCompleted={completedIds.includes(exercise.id)}
              onMarkComplete={onMarkComplete}
              onExpanded={() => onExerciseExpanded(chapterId)}
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

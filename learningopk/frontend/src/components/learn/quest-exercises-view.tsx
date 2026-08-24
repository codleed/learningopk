"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  CheckCircle2,
  Flame,
  Sparkles,
  Trophy,
  ChevronDown,
  GripVertical,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ContentRenderer } from "@/components/common/content-renderer";
import { cn } from "@/lib/utils";
import type { ChapterDetailResponse } from "@/lib/learn-api";
import { XP_REWARDS } from "@/lib/gamification-types";
import { NumericalVisualizationRenderer } from "@/components/learn/numerical-visualization-renderer";
import { FillInBlanksRenderer } from "@/components/learn/fill-in-blanks-renderer";

type Exercise = ChapterDetailResponse["exercises"][number];

interface QuestExercisesViewProps {
  exercises: Exercise[];
  completedIds: number[];
  onMarkComplete: (exerciseId: number, difficulty: "easy" | "medium" | "hard") => void;
  chapterId?: number;
}

const DIFFICULTY_CONFIG = {
  easy: {
    label: "Easy",
    variant: "success" as const,
    xp: XP_REWARDS.EXERCISE_COMPLETE,
  },
  medium: {
    label: "Medium",
    variant: "warning" as const,
    xp: XP_REWARDS.EXERCISE_MEDIUM,
  },
  hard: {
    label: "Hard",
    variant: "danger" as const,
    xp: XP_REWARDS.EXERCISE_HARD,
  },
};

const STORAGE_KEY = (chapterId: number) => `exercise-order-${chapterId}`;

export function QuestExercisesView({
  exercises,
  completedIds,
  onMarkComplete,
  chapterId,
}: QuestExercisesViewProps) {
  const reduced = useReducedMotion();
  const [orderOverride, setOrderOverride] = useState<number[] | null>(null);

  useEffect(() => {
    if (!chapterId) {
      setOrderOverride(null);
      return;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY(chapterId));
      if (raw) {
        const parsed = JSON.parse(raw) as number[];
        const allIds = new Set(exercises.map((e) => e.id));
        if (parsed.length === exercises.length && parsed.every((id) => allIds.has(id))) {
          setOrderOverride(parsed);
          return;
        }
      }
    } catch {
      /* ignore */
    }
    setOrderOverride(null);
  }, [chapterId, exercises]);

  const orderedExercises = useMemo(() => {
    if (!orderOverride || orderOverride.length !== exercises.length) return exercises;
    const map = new Map(exercises.map((e) => [e.id, e]));
    return orderOverride.map((id) => map.get(id)!).filter(Boolean);
  }, [exercises, orderOverride]);

  const saveOrder = useCallback(
    (newOrder: number[]) => {
      setOrderOverride(newOrder);
      if (chapterId) {
        localStorage.setItem(STORAGE_KEY(chapterId), JSON.stringify(newOrder));
      }
    },
    [chapterId]
  );

  const moveUp = useCallback(
    (index: number) => {
      if (index <= 0) return;
      const ids = orderedExercises.map((e) => e.id);
      const newIds = [...ids];
      [newIds[index], newIds[index - 1]] = [newIds[index - 1], newIds[index]];
      saveOrder(newIds);
    },
    [orderedExercises, saveOrder]
  );

  const moveDown = useCallback(
    (index: number) => {
      if (index >= orderedExercises.length - 1) return;
      const ids = orderedExercises.map((e) => e.id);
      const newIds = [...ids];
      [newIds[index], newIds[index + 1]] = [newIds[index + 1], newIds[index]];
      saveOrder(newIds);
    },
    [orderedExercises, saveOrder]
  );

  const resetOrder = useCallback(() => {
    setOrderOverride(null);
    if (chapterId) {
      localStorage.removeItem(STORAGE_KEY(chapterId));
    }
  }, [chapterId]);

  const completedCount = completedIds.length;
  const totalCount = exercises.length;
  const allCompleted = totalCount > 0 && completedCount >= totalCount;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const hasCustomOrder = orderOverride !== null;

  return (
    <div className="space-y-5">
      {/* Progress header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-warning/10">
            <Flame className="h-5 w-5 text-accent-warning" aria-hidden />
          </div>
          <div>
            <p className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-[0.08em] text-text-muted">
              Training Ground
            </p>
            <p className="font-[var(--font-display)] text-base font-semibold text-text-primary">
              {completedCount}/{totalCount} completed
            </p>
          </div>
        </div>
        {hasCustomOrder && (
          <Button variant="ghost" size="sm" onClick={resetOrder}>
            Reset order
          </Button>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-2 overflow-hidden rounded-full bg-bg-subtle">
        <motion.div
          initial={reduced ? false : { width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={reduced ? { duration: 0 } : { duration: 0.6, ease: "easeOut" }}
          className="h-full rounded-full bg-gradient-to-r from-accent-warning to-accent-primary"
        />
      </div>

      {/* Exercise list */}
      <div className="space-y-3">
        {orderedExercises.map((exercise, index) => {
          const isComplete = completedIds.includes(exercise.id);
          const difficulty = (exercise.difficulty?.toLowerCase() ?? "easy") as
            "easy" | "medium" | "hard";
          const config = DIFFICULTY_CONFIG[difficulty] ?? DIFFICULTY_CONFIG.easy;

          return (
            <motion.div
              key={exercise.id}
              layout
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                reduced
                  ? { duration: 0 }
                  : {
                      delay: Math.min(index * 0.04, 0.4),
                      duration: 0.35,
                      ease: [0.23, 1, 0.32, 1],
                    }
              }
              className={cn(
                "rounded-xl border p-3 sm:p-4 transition-all duration-200",
                isComplete
                  ? "border-accent-success/30 bg-accent-success/[0.03]"
                  : "border-border-default bg-bg-surface hover:border-border-strong"
              )}
            >
              <div className="flex items-start gap-2 sm:gap-4">
                {/* Reorder controls */}
                <div className="flex shrink-0 flex-col items-center gap-0.5 pt-1">
                  <button
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-subtle hover:text-text-primary disabled:opacity-30"
                    aria-label="Move exercise up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-bg-subtle font-[var(--font-mono)] text-xs font-bold text-text-secondary">
                    {index + 1}
                  </span>
                  <button
                    onClick={() => moveDown(index)}
                    disabled={index === orderedExercises.length - 1}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-subtle hover:text-text-primary disabled:opacity-30"
                    aria-label="Move exercise down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  {/* Meta row */}
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge variant={config.variant} size="sm">
                      {config.label}
                    </Badge>
                    <span className="font-[var(--font-mono)] text-[0.625rem] text-text-muted">
                      +{config.xp} XP
                    </span>
                  </div>

                  {/* Question content */}
                  {exercise.type === "fill_in_blanks" ? (
                    <div className="text-sm text-text-primary">
                      <FillInBlanksRenderer
                        question={exercise.question}
                        blanksAnswer={exercise.blanksAnswer}
                        statements={exercise.statements}
                        onComplete={() => onMarkComplete(exercise.id, difficulty)}
                      />
                    </div>
                  ) : (
                    <div className="text-sm text-text-primary">
                      <ContentRenderer
                        content={exercise.question}
                        variant="compact"
                        enableMath
                        enableCode={false}
                      />
                    </div>
                  )}

                  {/* Solution preview */}
                  {exercise.solution && (
                    <details className="mt-3 group/sol">
                      <summary className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text-secondary [&::-webkit-details-marker]:hidden">
                        <ChevronDown
                          className="h-3 w-3 transition-transform group-open/sol:rotate-180"
                          aria-hidden
                        />
                        View solution
                      </summary>
                      <div className="mt-2 rounded-lg border border-border-default bg-bg-subtle/50 p-3">
                        <ContentRenderer
                          content={exercise.solution}
                          variant="compact"
                          enableMath
                          enableCode
                        />
                      </div>
                    </details>
                  )}
                </div>

                {/* Action button */}
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {isComplete ? (
                    <motion.div
                      initial={reduced ? false : { scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={reduced ? { duration: 0 } : undefined}
                      className="flex items-center gap-1.5 rounded-full bg-accent-success px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Solved
                    </motion.div>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onMarkComplete(exercise.id, difficulty)}
                    >
                      Mark Solved
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* All completed celebration */}
      <AnimatePresence>
        {allCompleted && (
          <motion.div
            initial={reduced ? false : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0, scale: 0.95 }}
            transition={reduced ? { duration: 0 } : undefined}
            className={cn(
              "flex flex-col items-center gap-4 rounded-xl p-6 sm:p-8 text-center",
              "border-2 border-accent-primary/25",
              "bg-gradient-to-br from-accent-primary/5 via-bg-surface to-accent-warning/5"
            )}
          >
            <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-primary to-accent-warning shadow-lg">
              <Trophy className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
            </div>
            <div>
              <p className="font-[var(--font-display)] text-lg sm:text-xl font-bold text-text-primary">
                Training Complete!
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                You&apos;ve conquered all exercises in this chapter.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-accent-primary px-4 py-2 font-[var(--font-mono)] text-sm font-bold text-white">
              <Sparkles className="h-4 w-4" />+{XP_REWARDS.EXERCISE_BONUS_ALL} XP Bonus!
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

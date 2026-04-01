"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Flame, Sparkles, Trophy, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ContentRenderer } from "@/components/common/content-renderer";
import { cn } from "@/lib/utils";
import type { ChapterDetailResponse } from "@/lib/learn-api";
import { XP_REWARDS } from "@/lib/gamification-types";

type Exercise = ChapterDetailResponse["exercises"][number];

interface QuestExercisesViewProps {
  exercises: Exercise[];
  completedIds: number[];
  onMarkComplete: (exerciseId: number, difficulty: "easy" | "medium" | "hard") => void;
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

export function QuestExercisesView({
  exercises,
  completedIds,
  onMarkComplete,
}: QuestExercisesViewProps) {
  const completedCount = completedIds.length;
  const totalCount = exercises.length;
  const allCompleted = totalCount > 0 && completedCount >= totalCount;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Progress header */}
      <div className="flex items-center justify-between">
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
      </div>

      {/* Progress bar */}
      <div className="h-2 overflow-hidden rounded-full bg-bg-subtle">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="h-full rounded-full bg-gradient-to-r from-accent-warning to-accent-primary"
        />
      </div>

      {/* Exercise list */}
      <div className="space-y-3">
        {exercises.map((exercise, index) => {
          const isComplete = completedIds.includes(exercise.id);
          const difficulty = (exercise.difficulty?.toLowerCase() ?? "easy") as
            | "easy"
            | "medium"
            | "hard";
          const config = DIFFICULTY_CONFIG[difficulty] ?? DIFFICULTY_CONFIG.easy;

          return (
            <motion.div
              key={exercise.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: Math.min(index * 0.04, 0.4),
                duration: 0.35,
                ease: [0.23, 1, 0.32, 1],
              }}
              className={cn(
                "rounded-xl border p-4 transition-all duration-200",
                isComplete
                  ? "border-accent-success/30 bg-accent-success/[0.03]"
                  : "border-border-default bg-bg-surface hover:border-border-strong"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  {/* Meta row */}
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-bg-subtle font-[var(--font-mono)] text-xs font-bold text-text-secondary">
                      {index + 1}
                    </span>
                    <Badge variant={config.variant} size="sm">
                      {config.label}
                    </Badge>
                    <span className="font-[var(--font-mono)] text-[0.625rem] text-text-muted">
                      +{config.xp} XP
                    </span>
                  </div>

                  {/* Question content */}
                  <div className="text-sm text-text-primary">
                    <ContentRenderer
                      content={exercise.question}
                      variant="compact"
                      enableMath
                      enableCode={false}
                    />
                  </div>

                  {/* Solution preview */}
                  {exercise.solution && (
                    <details className="mt-3 group/sol">
                      <summary className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text-secondary [&::-webkit-details-marker]:hidden">
                        <ChevronDown className="h-3 w-3 transition-transform group-open/sol:rotate-180" aria-hidden />
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
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
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
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              "flex flex-col items-center gap-4 rounded-2xl p-8 text-center",
              "border-2 border-accent-primary/25",
              "bg-gradient-to-br from-accent-primary/5 via-bg-surface to-accent-warning/5"
            )}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-primary to-accent-warning shadow-lg">
              <Trophy className="h-8 w-8 text-white" />
            </div>
            <div>
              <p className="font-[var(--font-display)] text-xl font-bold text-text-primary">
                Training Complete!
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                You&apos;ve conquered all exercises in this chapter.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-accent-primary px-4 py-2 font-[var(--font-mono)] text-sm font-bold text-white">
              <Sparkles className="h-4 w-4" />
              +{XP_REWARDS.EXERCISE_BONUS_ALL} XP Bonus!
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

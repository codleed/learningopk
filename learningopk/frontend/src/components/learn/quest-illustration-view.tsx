"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Atom,
  CheckCircle2,
  ChevronDown,
  Eye,
  Sparkles,
  Trophy,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ContentRenderer } from "@/components/common/content-renderer";
import { cn } from "@/lib/utils";
import type { ChapterDetailResponse } from "@/lib/learn-api";
import { XP_REWARDS } from "@/lib/gamification-types";
import { NumericalVisualizationRenderer } from "@/components/learn/numerical-visualization-renderer";

type Exercise = ChapterDetailResponse["exercises"][number];

interface QuestIllustrationViewProps {
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

/* ─── Empty state ─── */

function IllustrationEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-primary/10">
        <Atom className="h-7 w-7 text-accent-primary" aria-hidden />
      </div>
      <div>
        <p className="font-[var(--font-display)] text-base font-semibold text-text-primary">
          No illustrations yet
        </p>
        <p className="mt-1 max-w-sm text-sm text-text-secondary">
          This chapter doesn&apos;t have any numerical exercises with
          visualizations. Check back after new content is added.
        </p>
      </div>
    </div>
  );
}

/* ─── Main component ─── */

export function QuestIllustrationView({
  exercises,
  completedIds,
  onMarkComplete,
}: QuestIllustrationViewProps) {
  const reduced = useReducedMotion();
  const completedCount = completedIds.length;
  const totalCount = exercises.length;
  const allCompleted = totalCount > 0 && completedCount >= totalCount;
  const progressPercent =
    totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (totalCount === 0) {
    return <IllustrationEmptyState />;
  }

  return (
    <div className="space-y-6">
      {/* Progress header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary/10">
            <Atom className="h-5 w-5 text-accent-primary" aria-hidden />
          </div>
          <div>
            <p className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-[0.08em] text-text-muted">
              Illustration Lab
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
          initial={reduced ? false : { width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={reduced ? { duration: 0 } : { duration: 0.6, ease: "easeOut" }}
          className="h-full rounded-full bg-gradient-to-r from-accent-primary to-accent-info"
        />
      </div>

      {/* Exercise cards — visualization-first layout */}
      <div className="space-y-5">
        {exercises.map((exercise, index) => {
          const isComplete = completedIds.includes(exercise.id);
          const difficulty = (exercise.difficulty?.toLowerCase() ?? "easy") as
            | "easy"
            | "medium"
            | "hard";
          const config = DIFFICULTY_CONFIG[difficulty] ?? DIFFICULTY_CONFIG.easy;
          const hasVisualization =
            typeof exercise.visualizationHtml === "string" &&
            exercise.visualizationHtml.trim().length > 0;

          return (
            <motion.div
              key={exercise.id}
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduced ? { duration: 0 } : {
                delay: Math.min(index * 0.04, 0.4),
                duration: 0.35,
                ease: [0.23, 1, 0.32, 1],
              }}
              className={cn(
                "overflow-hidden rounded-xl border transition-all duration-200",
                isComplete
                  ? "border-accent-success/30 bg-accent-success/[0.03]"
                  : "border-border-default bg-bg-surface hover:border-border-strong"
              )}
            >
              {/* Hero visualization */}
              {hasVisualization ? (
                <div className="border-b border-border-default">
                  <NumericalVisualizationRenderer
                    visualizationHtml={exercise.visualizationHtml}
                    title={`Exercise ${exercise.exerciseNumber ?? index + 1}`}
                    className="rounded-none border-0"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 border-b border-border-default bg-bg-subtle/50 px-4 py-3">
                  <Eye className="h-4 w-4 text-text-muted" aria-hidden />
                  <span className="text-xs font-medium text-text-muted">
                    No visualization available
                  </span>
                </div>
              )}

              {/* Content body */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    {/* Meta row */}
                    <div className="mb-2 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-bg-subtle font-[var(--font-mono)] text-xs font-bold text-text-secondary">
                        {exercise.exerciseNumber ?? index + 1}
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

                    {/* Solution */}
                    {exercise.solution && (
                      <details className="group/sol mt-3">
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
            className={cn(
              "flex flex-col items-center gap-4 rounded-2xl p-8 text-center",
              "border-2 border-accent-primary/25",
              "bg-gradient-to-br from-accent-primary/5 via-bg-surface to-accent-info/5"
            )}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-primary to-accent-info shadow-lg">
              <Trophy className="h-8 w-8 text-white" />
            </div>
            <div>
              <p className="font-[var(--font-display)] text-xl font-bold text-text-primary">
                Illustrations Mastered!
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                You&apos;ve completed all numerical visualizations in this chapter.
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

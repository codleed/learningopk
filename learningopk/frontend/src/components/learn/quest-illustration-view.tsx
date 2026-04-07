"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Atom,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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

/* ─── Slide animation variants ─── */

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
  }),
};

const slideTransition = {
  x: { type: "spring" as const, stiffness: 400, damping: 35 },
  opacity: { duration: 0.18 },
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [direction, setDirection] = useState(0);

  const totalCount = exercises.length;
  const completedCount = completedIds.length;
  const allCompleted = totalCount > 0 && completedCount >= totalCount;
  const progressPercent =
    totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  /* ─── Navigation helpers ─── */

  const goTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= totalCount) return;
      setDirection(index > currentIndex ? 1 : -1);
      setCurrentIndex(index);
      setDrawerOpen(false);
    },
    [currentIndex, totalCount]
  );

  const goNext = useCallback(() => {
    if (currentIndex < totalCount - 1) {
      setDirection(1);
      setCurrentIndex((i) => i + 1);
      setDrawerOpen(false);
    }
  }, [currentIndex, totalCount]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex((i) => i - 1);
      setDrawerOpen(false);
    }
  }, [currentIndex]);

  /* ─── Keyboard navigation ─── */

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight") {
        goNext();
      } else if (e.key === "ArrowLeft") {
        goPrev();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev]);

  /* ─── Empty state guard ─── */

  if (totalCount === 0) {
    return <IllustrationEmptyState />;
  }

  const exercise = exercises[currentIndex]!;
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
    <div
      className="flex flex-col"
      style={{ height: "calc(100vh - 19rem)" }}
    >
      {/* ─── A) Progress strip ─── */}
      <div className="flex items-center justify-between px-1 pb-3">
        {/* Left: icon + label + count */}
        <div className="flex items-center gap-2">
          <Atom className="h-4 w-4 text-accent-primary" aria-hidden />
          <span className="font-[var(--font-mono)] text-[0.625rem] uppercase tracking-[0.08em] text-text-muted">
            Illustration Lab
          </span>
          <span className="font-[var(--font-mono)] text-[0.625rem] font-semibold text-text-secondary">
            {currentIndex + 1}/{totalCount}
          </span>
        </div>

        {/* Center: stepper dots */}
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Exercise navigation">
          {exercises.map((ex, i) => {
            const dotCompleted = completedIds.includes(ex.id);
            const isActive = i === currentIndex;
            return (
              <button
                key={ex.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Exercise ${i + 1}${dotCompleted ? " (completed)" : ""}`}
                onClick={() => goTo(i)}
                className={cn(
                  "h-2 rounded-full transition-all duration-200",
                  isActive
                    ? "w-6 bg-accent-primary"
                    : dotCompleted
                      ? "w-2 bg-accent-success"
                      : "w-2 bg-bg-subtle"
                )}
              />
            );
          })}
        </div>

        {/* Right: mini progress bar */}
        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-bg-subtle">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent-primary to-accent-info transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* ─── B) Visualization area ─── */}
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-border-default">
        {/* Left arrow */}
        {currentIndex > 0 && (
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous exercise"
            className="absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border-default bg-bg-surface/80 shadow-[var(--shadow-sm)] backdrop-blur-sm transition-colors hover:bg-bg-elevated"
          >
            <ChevronLeft className="h-4 w-4 text-text-secondary" />
          </button>
        )}

        {/* Right arrow */}
        {currentIndex < totalCount - 1 && (
          <button
            type="button"
            onClick={goNext}
            aria-label="Next exercise"
            className="absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border-default bg-bg-surface/80 shadow-[var(--shadow-sm)] backdrop-blur-sm transition-colors hover:bg-bg-elevated"
          >
            <ChevronRight className="h-4 w-4 text-text-secondary" />
          </button>
        )}

        {/* Visualization content with slide animation */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={exercise.id}
            custom={direction}
            variants={reduced ? undefined : slideVariants}
            initial={reduced ? false : "enter"}
            animate={reduced ? undefined : "center"}
            exit={reduced ? undefined : "exit"}
            transition={reduced ? { duration: 0 } : slideTransition}
            className="h-full"
          >
            {hasVisualization ? (
              <NumericalVisualizationRenderer
                visualizationHtml={exercise.visualizationHtml}
                title={`Exercise ${exercise.exerciseNumber ?? currentIndex + 1}`}
                className="h-full rounded-none border-0"
                fillHeight
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-subtle">
                  <Eye className="h-5 w-5 text-text-muted" aria-hidden />
                </div>
                <p className="text-sm font-medium text-text-secondary">
                  No visualization for this exercise
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ─── C) Bottom drawer ─── */}
      <div className="mt-3 overflow-hidden rounded-xl border border-border-default bg-bg-surface">
        {/* Collapsed bar — always visible */}
        <button
          type="button"
          onClick={() => setDrawerOpen((o) => !o)}
          className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-bg-subtle/50"
          aria-expanded={drawerOpen}
        >
          {/* Exercise number badge */}
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-bg-subtle font-[var(--font-mono)] text-xs font-bold text-text-secondary">
            {exercise.exerciseNumber ?? currentIndex + 1}
          </span>

          {/* Difficulty badge */}
          <Badge variant={config.variant} size="sm">
            {config.label}
          </Badge>

          {/* XP */}
          <span className="font-[var(--font-mono)] text-[0.625rem] text-text-muted">
            +{config.xp} XP
          </span>

          {/* Spacer */}
          <span className="flex-1" />

          {/* Mark Solved / Solved pill */}
          {isComplete ? (
            <span className="flex items-center gap-1 rounded-full bg-accent-success px-2.5 py-1 text-[0.625rem] font-semibold text-white">
              <CheckCircle2 className="h-3 w-3" />
              Solved
            </span>
          ) : (
            <Button
              size="xs"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                onMarkComplete(exercise.id, difficulty);
              }}
            >
              Mark Solved
            </Button>
          )}

          {/* Chevron toggle */}
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-text-muted transition-transform duration-200",
              drawerOpen && "rotate-180"
            )}
            aria-hidden
          />
        </button>

        {/* Expanded content */}
        <AnimatePresence initial={false}>
          {drawerOpen && (
            <motion.div
              initial={reduced ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={reduced ? undefined : { height: 0, opacity: 0 }}
              transition={
                reduced
                  ? { duration: 0 }
                  : { height: { duration: 0.25, ease: [0.23, 1, 0.32, 1] }, opacity: { duration: 0.2 } }
              }
              className="overflow-hidden"
            >
              <div className="border-t border-border-default px-4 py-3 space-y-3">
                {/* Question */}
                <div className="text-sm text-text-primary">
                  <ContentRenderer
                    content={exercise.question}
                    variant="compact"
                    enableMath
                    enableCode={false}
                  />
                </div>

                {/* Solution disclosure */}
                {exercise.solution && (
                  <details className="group/sol">
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── D) Completion celebration ─── */}
      <AnimatePresence>
        {allCompleted && (
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: 8 }}
            className="mt-3 flex items-center gap-3 rounded-xl border border-accent-primary/25 bg-gradient-to-r from-accent-primary/5 via-bg-surface to-accent-info/5 px-4 py-2.5"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-primary to-accent-info">
              <Trophy className="h-4 w-4 text-white" />
            </div>
            <p className="font-[var(--font-display)] text-sm font-semibold text-text-primary">
              Illustrations Mastered!
            </p>
            <span className="ml-auto flex items-center gap-1 rounded-full bg-accent-primary px-3 py-1 font-[var(--font-mono)] text-[0.625rem] font-bold text-white">
              <Sparkles className="h-3 w-3" />
              +{XP_REWARDS.EXERCISE_BONUS_ALL} XP
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

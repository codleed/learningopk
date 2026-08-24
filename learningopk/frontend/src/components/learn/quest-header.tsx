"use client";

import { Star, Trophy, Target } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { ProgressRing } from "@/components/common/progress-ring";
import { StreakCounter } from "@/components/gamification/streak-counter";
import { Badge } from "@/components/ui/badge";
import type { GamificationState } from "@/lib/gamification-types";
import { cn } from "@/lib/utils";
import { useChapter } from "./chapter-context";

interface QuestHeaderProps {
  gamificationState: GamificationState;
  streak: number;
  completionPercent: number;
  chapterXp: number;
}

export function QuestHeader(props: QuestHeaderProps) {
  const { gamificationState, streak, completionPercent, chapterXp } = props;

  const { boardName, subjectName, chapterNumber, chapterTitle } = useChapter();
  const reduced = useReducedMotion();
  return (
    <motion.header
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? { duration: 0 } : { duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      className={cn(
        "relative overflow-hidden rounded-xl",
        "border border-border-default bg-bg-surface",
        "p-4 sm:p-5 lg:p-6"
      )}
    >
      {/* Background effects */}
      <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-accent-primary/6 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-accent-success/5 blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
          backgroundSize: "20px 20px",
        }}
      />

      <div className="relative">
        {/* Top row: breadcrumb + streak */}
        <div className="mb-3 sm:mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <span className="font-medium">{boardName}</span>
            <span className="text-text-muted">/</span>
            <span>{subjectName}</span>
          </div>
          <StreakCounter streak={streak} />
        </div>

        {/* Main content row */}
        <div className="flex items-start gap-4 sm:gap-6">
          {/* Progress ring */}
          <motion.div
            initial={reduced ? false : { opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={reduced ? { duration: 0 } : { delay: 0.15, duration: 0.4 }}
            className="shrink-0"
          >
            <ProgressRing
              percentage={completionPercent}
              size={64}
              strokeWidth={5}
              className="sm:hidden"
            />
            <div className="hidden sm:block">
              <ProgressRing percentage={completionPercent} size={76} strokeWidth={6} />
            </div>
          </motion.div>

          {/* Title and meta */}
          <div className="min-w-0 flex-1">
            {/* Chapter badge */}
            <div className="mb-1.5 sm:mb-2 flex items-center gap-2">
              <Badge variant="primary" size="sm">
                <Target className="mr-0.5 h-3 w-3" aria-hidden />
                Chapter {chapterNumber}
              </Badge>
            </div>

            {/* Chapter title */}
            <h1 className="font-[var(--font-display)] text-lg font-bold tracking-tight text-text-primary sm:text-xl lg:text-2xl">
              {chapterTitle}
            </h1>

            {/* XP + Level stats */}
            <div className="mt-2 sm:mt-3 flex flex-wrap items-center gap-2 sm:gap-3">
              <motion.div
                initial={reduced ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={reduced ? { duration: 0 } : { delay: 0.25, duration: 0.3 }}
                className="flex items-center gap-1.5 rounded-lg border border-accent-warning/20 bg-accent-warning-light px-2.5 py-1"
              >
                <Star className="h-3.5 w-3.5 fill-accent-warning text-accent-warning" aria-hidden />
                <span className="font-[var(--font-mono)] text-xs font-bold text-accent-warning">
                  +{chapterXp} XP
                </span>
              </motion.div>

              <motion.div
                initial={reduced ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={reduced ? { duration: 0 } : { delay: 0.3, duration: 0.3 }}
                className="flex items-center gap-1.5 rounded-lg border border-accent-primary/20 bg-accent-primary-light px-2.5 py-1"
              >
                <Trophy className="h-3.5 w-3.5 text-accent-primary" aria-hidden />
                <span className="font-[var(--font-mono)] text-xs font-bold text-accent-primary">
                  Level {gamificationState.level}
                </span>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-subtle">
            <motion.div
              initial={reduced ? false : { width: 0 }}
              animate={{ width: `${completionPercent}%` }}
              transition={
                reduced ? { duration: 0 } : { duration: 0.8, ease: "easeOut", delay: 0.3 }
              }
              className="h-full rounded-full bg-gradient-to-r from-accent-primary to-accent-success"
            />
          </div>
          <p className="mt-1.5 font-[var(--font-mono)] text-[0.6875rem] text-text-muted">
            {completionPercent < 100
              ? `${Math.round(completionPercent)}% complete — ${Math.round(100 - completionPercent)}% remaining`
              : "Quest complete!"}
          </p>
        </div>
      </div>
    </motion.header>
  );
}

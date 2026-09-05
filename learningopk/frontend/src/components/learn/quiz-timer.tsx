"use client";

import { useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { TIMER_WARNING_SECONDS, TIMER_CRITICAL_SECONDS } from "@/lib/quiz-constants";

type QuizTimerProps = {
  remainingSeconds: number;
  expired: boolean;
};

const formatTimeLeft = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
};

export function QuizTimer({ remainingSeconds, expired }: QuizTimerProps) {
  const reduced = useReducedMotion();
  const isWarning =
    remainingSeconds <= TIMER_WARNING_SECONDS && remainingSeconds > TIMER_CRITICAL_SECONDS;
  const isCritical = remainingSeconds <= TIMER_CRITICAL_SECONDS && remainingSeconds > 0;

  const announcement = useMemo(() => {
    if (remainingSeconds === 300) return "5 minutes remaining";
    if (remainingSeconds === 60) return "1 minute remaining";
    if (remainingSeconds === 10) return "10 seconds remaining";
    return null;
  }, [remainingSeconds]);

  return (
    <div className="flex items-center gap-2">
      <Clock
        className={cn(
          "h-4 w-4",
          expired && "text-accent-danger",
          isCritical && !expired && "text-accent-danger",
          isWarning && !expired && "text-accent-warning",
          !isWarning && !isCritical && !expired && "text-text-secondary"
        )}
        aria-hidden="true"
      />
      <AnimatePresence mode="wait">
        <motion.p
          key={isCritical ? "critical" : isWarning ? "warning" : "normal"}
          initial={reduced ? false : { opacity: 0, scale: 0.95 }}
          animate={{
            opacity: 1,
            scale: isCritical && !expired && !reduced ? [1, 1.05, 1] : 1,
          }}
          transition={
            isCritical && !expired && !reduced
              ? { scale: { repeat: Infinity, duration: 1, ease: "easeInOut" } }
              : { duration: reduced ? 0 : 0.2 }
          }
          className={cn(
            "font-display text-lg font-bold tabular-nums",
            expired && "text-accent-danger",
            isCritical && !expired && "text-accent-danger",
            isWarning && !expired && "text-accent-warning",
            !isWarning && !isCritical && !expired && "text-text-primary"
          )}
          aria-live={isCritical ? "assertive" : "polite"}
          aria-atomic="true"
        >
          {formatTimeLeft(remainingSeconds)}
        </motion.p>
      </AnimatePresence>

      {isCritical && !expired && announcement && (
        <p className="sr-only" role="alert">
          {announcement}
        </p>
      )}
    </div>
  );
}

export function QuizTimerCompact({ remainingSeconds, expired }: QuizTimerProps) {
  const reduced = useReducedMotion();
  const isWarning =
    remainingSeconds <= TIMER_WARNING_SECONDS && remainingSeconds > TIMER_CRITICAL_SECONDS;
  const isCritical = remainingSeconds <= TIMER_CRITICAL_SECONDS && remainingSeconds > 0;

  return (
    <motion.div
      animate={isCritical && !expired && !reduced ? { scale: [1, 1.04, 1] } : { scale: 1 }}
      transition={
        isCritical && !expired && !reduced
          ? { repeat: Infinity, duration: 1, ease: "easeInOut" }
          : { duration: reduced ? 0 : 0.2 }
      }
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold",
        expired && "bg-accent-danger-light text-accent-danger",
        isCritical && !expired && "bg-accent-danger-light text-accent-danger",
        isWarning && !expired && "bg-accent-warning-light text-accent-warning",
        !isWarning && !isCritical && !expired && "bg-bg-subtle text-text-secondary"
      )}
      aria-live={isCritical ? "assertive" : "polite"}
    >
      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="tabular-nums">{formatTimeLeft(remainingSeconds)}</span>
    </motion.div>
  );
}

"use client";

import { useMemo } from "react";
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
  const isWarning = remainingSeconds <= TIMER_WARNING_SECONDS && remainingSeconds > TIMER_CRITICAL_SECONDS;
  const isCritical = remainingSeconds <= TIMER_CRITICAL_SECONDS && remainingSeconds > 0;

  const announcement = useMemo(() => {
    if (remainingSeconds === 300) return "5 minutes remaining";
    if (remainingSeconds === 60) return "1 minute remaining";
    if (remainingSeconds === 10) return "10 seconds remaining";
    return null;
  }, [remainingSeconds]);

  return (
    <div className="text-right">
      <p
        className={cn(
          "text-2xl font-bold tabular-nums",
          expired && "text-destructive",
          isCritical && !expired && "text-destructive animate-pulse-soft",
          isWarning && !expired && "text-[var(--warning)]",
          !isWarning && !isCritical && !expired && "text-foreground"
        )}
        aria-live={isCritical ? "assertive" : "polite"}
        aria-atomic="true"
      >
        {formatTimeLeft(remainingSeconds)}
      </p>
      <p className="text-xs text-muted-foreground">Time left</p>

      {isCritical && !expired && announcement && (
        <p className="sr-only" role="alert">
          {announcement}
        </p>
      )}
    </div>
  );
}

export function QuizTimerCompact({ remainingSeconds, expired }: QuizTimerProps) {
  const isWarning = remainingSeconds <= TIMER_WARNING_SECONDS && remainingSeconds > TIMER_CRITICAL_SECONDS;
  const isCritical = remainingSeconds <= TIMER_CRITICAL_SECONDS && remainingSeconds > 0;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold",
        expired && "bg-destructive/10 text-destructive",
        isCritical && !expired && "bg-destructive/10 text-destructive animate-pulse-soft",
        isWarning && !expired && "bg-[var(--warning)]/10 text-[var(--warning)]",
        !isWarning && !isCritical && !expired && "bg-muted text-muted-foreground"
      )}
      aria-live={isCritical ? "assertive" : "polite"}
    >
      <span className="tabular-nums">{formatTimeLeft(remainingSeconds)}</span>
    </div>
  );
}

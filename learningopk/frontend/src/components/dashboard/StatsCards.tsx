"use client";

import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

export interface XpInfo {
  xp: number;
  level: number;
  levelName: string;
  xpToNextLevel: number;
  leveledUp?: boolean;
}

export interface StreakFreezeInfo {
  canUseStreakFreeze: boolean;
  nextFreezeAvailableAt: string | null;
}

interface StatsCardsProps {
  streakDays: number;
  longestStreakDays: number;
  xp: XpInfo | null;
  streakFreeze: StreakFreezeInfo | null;
  previousXp?: number;
}

export function StatsCards({
  streakDays,
  longestStreakDays,
  xp,
  streakFreeze,
  previousXp,
}: StatsCardsProps) {
  const { pushToast } = useToast();

  // Show XP gain toast when XP increases
  useEffect(() => {
    if (xp && previousXp !== undefined && xp.xp > previousXp) {
      const xpGained = xp.xp - previousXp;
      pushToast({
        title: `+${xpGained} XP earned!`,
        description: xp.leveledUp
          ? `Level up! You're now ${xp.levelName}`
          : `${xp.xpToNextLevel} XP to next level`,
        tone: xp.leveledUp ? "success" : "info",
      });
    }
  }, [xp, previousXp, pushToast]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {/* Streak Card */}
      <div className="rounded-xl bg-card p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/20">
            {/* Flame icon - CSS only, no emoji */}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5 text-orange-500"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-foreground/60">Streak</p>
            <p className="text-lg font-bold text-foreground">
              {streakDays}
              <span className="ml-1 text-xs font-normal text-foreground/50">
                days
              </span>
            </p>
          </div>
        </div>
        {longestStreakDays > 0 && (
          <p className="mt-2 text-[10px] text-foreground/40">
            Best: {longestStreakDays} days
          </p>
        )}
      </div>

      {/* XP Card */}
      {xp && (
        <div className="rounded-xl bg-card p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)]/20">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5 text-[var(--primary)]"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-foreground/60">XP</p>
              <p className="text-lg font-bold text-foreground">{xp.xp}</p>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-foreground/40">
            {xp.xpToNextLevel} to {xp.levelName}
          </p>
        </div>
      )}

      {/* Level Card */}
      {xp && (
        <div className="rounded-xl bg-card p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5 text-amber-500"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-foreground/60">Level</p>
              <p className="text-lg font-bold text-foreground">{xp.levelName}</p>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-foreground/40">
            Level {xp.level}
          </p>
        </div>
      )}

      {/* Streak Freeze Card */}
      {streakFreeze && (
        <div className="rounded-xl bg-card p-4">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg",
                streakFreeze.canUseStreakFreeze
                  ? "bg-cyan-500/20"
                  : "bg-muted"
              )}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className={cn(
                  "h-5 w-5",
                  streakFreeze.canUseStreakFreeze
                    ? "text-cyan-500"
                    : "text-foreground/30"
                )}
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-foreground/60">Freeze</p>
              <p className="text-lg font-bold text-foreground">
                {streakFreeze.canUseStreakFreeze ? "Available" : "Used"}
              </p>
            </div>
          </div>
          {!streakFreeze.canUseStreakFreeze &&
            streakFreeze.nextFreezeAvailableAt && (
              <p className="mt-2 text-[10px] text-foreground/40">
                Resets{" "}
                {new Date(streakFreeze.nextFreezeAvailableAt).toLocaleDateString()}
              </p>
            )}
        </div>
      )}
    </div>
  );
}

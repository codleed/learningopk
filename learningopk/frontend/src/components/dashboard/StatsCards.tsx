"use client";

import { useToast } from "@/components/ui/toast";
import { useEffect } from "react";

import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { StreakCounter } from "@/components/common/streak-counter";
import { XPBar } from "@/components/common/xp-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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
      <Card variant="default" className="!p-4 hover:!-translate-y-0">
        <div className="flex items-center gap-3">
          <StreakCounter count={streakDays} size="md" />
        </div>
        {longestStreakDays > 0 && (
          <p className="mt-2 text-[10px] text-text-muted">
            Best: {longestStreakDays} days
          </p>
        )}
      </Card>

      {/* XP Card */}
      {xp ? (
        <Card variant="default" className="!p-4 hover:!-translate-y-0 col-span-2">
          <p className="mb-2 text-xs font-medium text-text-secondary">
            Experience Points
          </p>
          <XPBar
            currentXP={xp.xp}
            maxXP={xp.xp + xp.xpToNextLevel}
            level={xp.level}
          />
          <p className="mt-2 text-[10px] text-text-muted">
            {xp.xpToNextLevel} XP to {xp.levelName}
          </p>
        </Card>
      ) : (
        <Card variant="default" className="!p-4 hover:!-translate-y-0 col-span-2">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-3 w-full rounded-full" />
          <Skeleton className="h-3 w-16 mt-2" />
        </Card>
      )}

      {/* Streak Freeze Card */}
      {streakFreeze && (
        <Card variant="default" className="!p-4 hover:!-translate-y-0">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg",
                streakFreeze.canUseStreakFreeze
                  ? "bg-accent-primary/10"
                  : "bg-bg-subtle"
              )}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className={cn(
                  "h-5 w-5",
                  streakFreeze.canUseStreakFreeze
                    ? "text-accent-primary"
                    : "text-text-muted"
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
              <p className="text-xs text-text-secondary">Freeze</p>
              <p className="text-sm font-bold text-text-primary">
                {streakFreeze.canUseStreakFreeze ? "Available" : "Used"}
              </p>
            </div>
          </div>
          {!streakFreeze.canUseStreakFreeze &&
            streakFreeze.nextFreezeAvailableAt && (
              <p className="mt-2 text-[10px] text-text-muted">
                Resets{" "}
                {new Date(
                  streakFreeze.nextFreezeAvailableAt
                ).toLocaleDateString()}
              </p>
            )}
        </Card>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertTriangle, ChevronRight, Shield, ShieldAlert, Sparkles, Trophy } from "lucide-react";

import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import {
  placeStreakWager,
  recoverStreakWager,
  type DashboardSummaryResponse,
} from "@/lib/progress-api";
import { getLevelDefinition, TIER_COLORS, LEVEL_DEFINITIONS } from "@/lib/gamification-types";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type XpInfo = NonNullable<DashboardSummaryResponse["xp"]>;

export interface StreakXPCardProps {
  streakDays: number;
  longestStreakDays: number;
  xp: XpInfo | null;
  summary: DashboardSummaryResponse;
}

/* ------------------------------------------------------------------ */
/*  Level Badge                                                        */
/* ------------------------------------------------------------------ */

function LevelBadge({ level, size = "md" }: { level: number; size?: "sm" | "md" | "lg" }) {
  const def = getLevelDefinition(level);
  const tier = TIER_COLORS[def.tier];
  const sizeClasses = {
    sm: "h-7 w-7 text-[11px]",
    md: "h-9 w-9 text-xs",
    lg: "h-11 w-11 text-sm",
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg border font-bold",
        tier.badgeBg,
        tier.badge,
        sizeClasses[size]
      )}
    >
      {level}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  XP Progress Section                                                */
/* ------------------------------------------------------------------ */

function XpProgressSection({ xp }: { xp: XpInfo }) {
  const levelDef = getLevelDefinition(xp.level);
  const tier = TIER_COLORS[levelDef.tier];
  const nextLevelDef = LEVEL_DEFINITIONS[xp.level + 1];

  // Calculate in-level progress
  const xpInLevel = xp.xpInCurrentLevel ?? xp.xp - levelDef.minXp;
  const xpForLevel =
    xp.xpRequiredForLevel ?? (nextLevelDef ? nextLevelDef.minXp - levelDef.minXp : 1);
  const safeForLevel = Math.max(xpForLevel, 1);
  const percentage = Math.min((xpInLevel / safeForLevel) * 100, 100);
  const isMax = xp.isMaxLevel ?? !nextLevelDef;

  return (
    <div className="space-y-2.5">
      {/* Total XP display + Level badge */}
      <div className="flex items-center gap-3">
        <LevelBadge level={xp.level} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold tabular-nums text-text-primary">
              {xp.xp.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-text-muted">XP</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={cn("text-xs font-semibold", tier.text)}>{levelDef.name}</span>
            {!isMax && nextLevelDef ? (
              <>
                <ChevronRight className="h-3 w-3 text-text-muted" />
                <span className="text-xs text-text-muted">{nextLevelDef.name}</span>
              </>
            ) : (
              <span className="text-xs text-text-muted">Max Level</span>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar to next level */}
      {!isMax ? (
        <div className="space-y-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-bg-subtle">
            <motion.div
              className={cn("h-full rounded-full bg-gradient-to-r", tier.progress)}
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] tabular-nums text-text-muted">
            <span>
              {xpInLevel.toLocaleString()} / {safeForLevel.toLocaleString()} XP
            </span>
            <span>
              {xp.xpToNextLevel.toLocaleString()} XP to Level {xp.level + 1}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-xl bg-cyan-500/10 border border-cyan-400/20 px-3 py-2 text-xs font-medium text-cyan-600 dark:text-cyan-300">
          <Trophy className="h-3.5 w-3.5" />
          Maximum level achieved!
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function StreakXPCard({ streakDays, longestStreakDays, xp, summary }: StreakXPCardProps) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [lockModalOpen, setLockModalOpen] = useState(summary.streakWager.showLockModal);
  const [wagerAmount, setWagerAmount] = useState(String(summary.streakWager.minWagerXp));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(() => {
    setLockModalOpen(summary.streakWager.showLockModal);
  }, [summary.streakWager.showLockModal]);

  const parsedWagerAmount = Number(wagerAmount);
  const wagerError =
    Number.isNaN(parsedWagerAmount) ||
    parsedWagerAmount < summary.streakWager.minWagerXp ||
    parsedWagerAmount > summary.streakWager.maxWagerXp
      ? `Enter ${summary.streakWager.minWagerXp}-${summary.streakWager.maxWagerXp} XP`
      : xp && parsedWagerAmount > xp.xp
        ? "Not enough XP available"
        : null;

  const handleWagerSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void onPlaceWager();
  };

  const onPlaceWager = async () => {
    if (wagerError) return;

    setIsSubmitting(true);
    try {
      await placeStreakWager(parsedWagerAmount);
      pushToast({
        title: "Streak locked",
        description: `Your ${parsedWagerAmount} XP wager now protects today's PKT streak window.`,
        tone: "success",
      });
      setLockModalOpen(false);
      router.refresh();
    } catch (error) {
      pushToast({
        title: "Couldn't lock streak",
        description: error instanceof Error ? error.message : "Please try again.",
        tone: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onRecover = async () => {
    setIsRecovering(true);
    try {
      await recoverStreakWager();
      pushToast({
        title: "Streak recovered",
        description: "Your streak freeze restored the broken wager day.",
        tone: "success",
      });
      router.refresh();
    } catch (error) {
      pushToast({
        title: "Recovery failed",
        description: error instanceof Error ? error.message : "Please try again.",
        tone: "error",
      });
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <>
      <Card variant="default" className="h-full flex flex-col">
        <CardHeader className="pb-2">
          <h3 className="font-[var(--font-display)] text-base font-bold text-text-primary">
            Streak & XP
          </h3>
        </CardHeader>
        <CardBody className="flex-1 flex flex-col justify-between gap-3">
          {/* Streak display */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-warning/10 text-accent-warning">
              <span className="text-lg font-bold">{streakDays}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">{streakDays}-day streak</p>
              {longestStreakDays > 0 && (
                <p className="text-xs text-text-muted">Longest: {longestStreakDays} days</p>
              )}
            </div>
          </div>

          {/* XP & Level section */}
          {xp ? (
            <XpProgressSection xp={xp} />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-5 w-24 rounded" />
                  <Skeleton className="h-3 w-32 rounded" />
                </div>
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
              <Skeleton className="h-3 w-1/3 rounded" />
            </div>
          )}

          {/* Streak wager warnings & actions */}
          {summary.streakWager.warningAtRisk ? (
            <div className="rounded-xl border border-accent-warning/30 bg-accent-warning-light p-3 text-xs text-text-secondary">
              <div className="flex items-start gap-2">
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0 text-accent-warning"
                  aria-hidden
                />
                <div>
                  <p className="font-semibold text-text-primary">Streak at Risk</p>
                  <p className="mt-1 text-text-secondary">
                    It&apos;s after 8 PM PKT and your {streakDays}-day streak is uncovered.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {summary.streakWager.activeWager ? (
            <div className="rounded-xl border border-accent-success/20 bg-accent-success-light p-3 text-xs text-text-secondary">
              <div className="flex items-start gap-2">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-accent-success" aria-hidden />
                <div>
                  <p className="font-semibold">Streak lock active</p>
                  <p className="mt-1 text-text-secondary">
                    {summary.streakWager.activeWager.amount} XP locked. Complete today&apos;s goal
                    before midnight PKT to get it back with +
                    {summary.streakWager.activeWager.bonusXp} XP.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {!summary.streakWager.activeWager && summary.streakWager.canPlaceWager ? (
            <Button
              variant="secondary"
              size="sm"
              width="full"
              iconLeft={<ShieldAlert />}
              onClick={() => setLockModalOpen(true)}
            >
              Lock streak
            </Button>
          ) : null}

          {summary.streakWager.brokenWager ? (
            <div className="rounded-xl border border-accent-danger/25 bg-accent-danger/8 p-3 text-xs text-text-secondary">
              <div className="flex items-start gap-2">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-accent-danger" aria-hidden />
                <div className="space-y-2">
                  <div>
                    <p className="font-semibold text-text-primary">Broken wager</p>
                    <p className="mt-1">
                      {summary.streakWager.brokenWager.amount} XP was lost for{" "}
                      {summary.streakWager.brokenWager.protectedDate}. You can use one streak freeze
                      to recover the streak.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    width="full"
                    loading={isRecovering}
                    disabled={!summary.streakWager.brokenWager.canRecoverWithFreeze}
                    onClick={() => void onRecover()}
                  >
                    {summary.streakWager.brokenWager.canRecoverWithFreeze
                      ? "Use streak freeze"
                      : "Freeze unavailable"}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </CardBody>
      </Card>

      <Dialog open={lockModalOpen} onOpenChange={setLockModalOpen} size="md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary/12 text-accent-primary">
              <Sparkles className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <DialogTitle>Streak Lock</DialogTitle>
              <DialogDescription>
                Lock in your streak! Wager 25-100 XP to protect it for 24 hours.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form
          onSubmit={handleWagerSubmit}
          aria-describedby={wagerError ? "wager-amount-error" : undefined}
        >
          <DialogBody className="space-y-4">
            <div className="rounded-xl border border-border-default bg-bg-base p-4 text-sm text-text-secondary">
              Complete today&apos;s goal before midnight PKT and your wager returns with a 50% XP
              bonus.
            </div>
            <Input
              id="wager-amount"
              label="Wager amount"
              type="number"
              min={summary.streakWager.minWagerXp}
              max={summary.streakWager.maxWagerXp}
              step={1}
              value={wagerAmount}
              error={wagerError}
              onChange={(event) => setWagerAmount(event.target.value)}
              suffix={<span className="text-xs">XP</span>}
            />
            {xp ? <p className="text-xs text-text-muted">Available balance: {xp.xp} XP</p> : null}
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setLockModalOpen(false)}
              disabled={isSubmitting}
            >
              Maybe later
            </Button>
            <Button type="submit" loading={isSubmitting} disabled={Boolean(wagerError)}>
              Lock streak
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}

"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileText,
  Sparkles,
  Target,
  Trophy,
  Calendar,
} from "lucide-react";

import { Card, CardHeader, CardBody, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProgressRing } from "@/components/common/progress-ring";
import { ConfettiCelebration } from "@/components/gamification/confetti-celebration";
import { completeTodaysFocus, type DashboardSummaryResponse } from "@/lib/progress-api";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface TodaysGoalCardProps {
  summary: DashboardSummaryResponse | null;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function TodaysGoalCard({ summary }: TodaysGoalCardProps) {
  const goal = summary?.todaysGoal;
  const initialFocus = summary?.todaysFocus ?? null;
  const [focus, setFocus] = useState(initialFocus);
  const [isSubmittingFocus, setIsSubmittingFocus] = useState(false);
  const [completionXp, setCompletionXp] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const difficultyVariant = useMemo(() => {
    switch (focus?.difficulty) {
      case "hard":
        return "danger" as const;
      case "medium":
        return "warning" as const;
      default:
        return "success" as const;
    }
  }, [focus?.difficulty]);

  const onCompleteFocus = async () => {
    try {
      setIsSubmittingFocus(true);
      const result = await completeTodaysFocus();
      setCompletionXp(result.xpAwarded);
      setShowConfetti(true);
      setFocus((current) =>
        current
          ? {
              ...current,
              completed: true,
              completedAt: result.completedAt,
            }
          : current
      );
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmittingFocus(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Focus variant                                                    */
  /* ---------------------------------------------------------------- */

  if (focus) {
    return (
      <>
        <ConfettiCelebration show={showConfetti} onComplete={() => setShowConfetti(false)} />
        <Card variant="default" className="h-full overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-primary">
                  Today&apos;s Focus
                </p>
                <h3 className="font-[var(--font-display)] text-lg font-bold leading-snug text-text-primary">
                  {focus.title}
                </h3>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent-primary/20 bg-accent-primary/10 text-accent-primary">
                {focus.completed ? (
                  <CheckCircle2 className="h-5 w-5" aria-hidden />
                ) : (
                  <Target className="h-5 w-5" aria-hidden />
                )}
              </div>
            </div>
          </CardHeader>

          <CardBody className="space-y-3 pt-0">
            {/* Meta badges */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={difficultyVariant} size="sm">
                {focus.difficulty}
              </Badge>
              <Badge variant="primary" size="sm">
                +{focus.xpReward} XP
              </Badge>
            </div>

            {/* Reason card */}
            <div className="space-y-2 rounded-xl border border-border-default/60 bg-bg-subtle/80 p-4">
              <p className="text-sm leading-relaxed text-text-secondary">{focus.reason}</p>
              {focus.subjectName ? (
                <p className="text-xs font-medium text-text-muted">
                  {focus.subjectName}
                  {focus.chapterTitle ? ` · ${focus.chapterTitle}` : ""}
                </p>
              ) : null}
            </div>

            {/* Action buttons */}
            <div className="grid gap-2 pt-1 sm:grid-cols-2">
              <Link href={focus.href} className="block">
                <Button variant="primary" width="full" iconRight={<ArrowRight />}>
                  {focus.ctaLabel}
                </Button>
              </Link>
              <Button
                variant={focus.completed ? "success" : "secondary"}
                width="full"
                loading={isSubmittingFocus}
                disabled={focus.completed}
                iconLeft={focus.completed ? <CheckCircle2 /> : <Sparkles />}
                onClick={() => void onCompleteFocus()}
              >
                {focus.completed ? "Completed" : "Mark Complete"}
              </Button>
            </div>

            {/* Completion celebration */}
            <AnimatePresence initial={false}>
              {focus.completed ? (
                <motion.div
                  key="todays-focus-complete"
                  initial={{ opacity: 0, y: 12, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 260, damping: 22 }}
                  className="flex items-start gap-3 rounded-xl border border-accent-success/20 bg-accent-success/10 px-4 py-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-success/15 text-accent-success">
                    <Trophy className="h-4 w-4" aria-hidden />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-semibold text-accent-success">
                      Momentum locked in
                      {completionXp ? (
                        <span className="ml-1.5 inline-flex items-center rounded-full bg-accent-success/15 px-2 py-0.5 text-xs font-bold tabular-nums">
                          +{completionXp} XP
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs leading-relaxed text-text-secondary">
                      Nice work — your daily micro-goal is already cleared for today.
                    </p>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </CardBody>
        </Card>
      </>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Fallback: progress ring variant                                  */
  /* ---------------------------------------------------------------- */

  return (
    <Card variant="default" className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h3 className="font-[var(--font-display)] text-base font-bold text-text-primary">
            Today&apos;s Focus
          </h3>
          <Target className="h-5 w-5 text-accent-success" aria-hidden />
        </div>
      </CardHeader>

      <CardBody className="flex flex-1 flex-col items-center justify-center gap-4">
        {/* Progress ring */}
        <div className="py-1">
          <ProgressRing
            percentage={goal?.percent ?? 0}
            size={96}
            strokeWidth={7}
            color="var(--accent-success)"
          />
        </div>

        {/* Inline stats */}
        <div className="flex w-full items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-accent-primary" aria-hidden />
            <span className="text-sm text-text-secondary">
              <span className="font-bold text-text-primary">{goal?.chaptersCompleted ?? 0}</span>
              <span className="text-text-muted">/{goal?.chaptersTarget ?? 3}</span> chapters
            </span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-accent-primary" aria-hidden />
            <span className="text-sm text-text-secondary">
              <span className="font-bold text-text-primary">{goal?.quizzesCompleted ?? 0}</span>
              <span className="text-text-muted">/{goal?.quizzesTarget ?? 1}</span> quizzes
            </span>
          </div>
        </div>
      </CardBody>

      {/* Evaluation date footer */}
      <CardFooter className="justify-center border-t border-border-default/60 py-3">
        <Calendar className="h-3 w-3 text-text-muted" aria-hidden />
        <p className="text-[11px] text-text-muted">
          Evaluated on {summary?.streakWager.currentPktDate ?? "today"} PKT
        </p>
      </CardFooter>
    </Card>
  );
}

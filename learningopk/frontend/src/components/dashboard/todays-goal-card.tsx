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
} from "lucide-react";

import { Card, CardHeader, CardBody } from "@/components/ui/card";
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

export function TodaysGoalCard({
  summary,
}: TodaysGoalCardProps) {
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

  if (focus) {
    return (
      <>
        <ConfettiCelebration show={showConfetti} onComplete={() => setShowConfetti(false)} />
        <Card variant="gradient" className="h-full overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-primary">
                  Today&apos;s Focus
                </p>
                <h3 className="mt-1 font-[var(--font-display)] text-lg font-bold text-text-primary">
                  {focus.title}
                </h3>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-accent-primary/20 bg-accent-primary/10 text-accent-primary shadow-[var(--shadow-sm)]">
                {focus.completed ? <CheckCircle2 className="h-5 w-5" aria-hidden /> : <Target className="h-5 w-5" aria-hidden />}
              </div>
            </div>
          </CardHeader>
          <CardBody className="space-y-4 pt-0">
            <div className="flex flex-wrap gap-2">
              <Badge variant={difficultyVariant} size="sm">{focus.difficulty}</Badge>
              <Badge variant="primary" size="sm">+{focus.xpReward} XP</Badge>
              <Badge variant="default" size="sm">{focus.durationMinutes} min</Badge>
              {focus.isRamadanAdjusted ? <Badge variant="outline" size="sm">Ramadan Mode</Badge> : null}
            </div>

            <div className="space-y-2 rounded-2xl border border-white/10 bg-[linear-gradient(135deg,var(--accent-success-light),var(--accent-primary-light))] p-4">
              <p className="text-sm leading-6 text-text-secondary">{focus.reason}</p>
              {focus.subjectName ? (
                <p className="text-xs font-medium text-text-muted">
                  {focus.subjectName}
                  {focus.chapterTitle ? ` · ${focus.chapterTitle}` : ""}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
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

            <AnimatePresence initial={false}>
              {focus.completed ? (
                <motion.div
                  key="todays-focus-complete"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="rounded-2xl border border-accent-success/25 bg-accent-success/10 px-4 py-3"
                >
                  <p className="text-sm font-semibold text-accent-success">
                    Momentum locked in{completionXp ? ` · +${completionXp} XP` : ""}
                  </p>
                  <p className="mt-1 text-xs text-text-secondary">
                    Nice work — your daily micro-goal is already cleared for today.
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </CardBody>
        </Card>
      </>
    );
  }

  return (
    <Card variant="default" className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h3 className="font-[var(--font-display)] text-base font-bold text-text-primary">
            Today&apos;s Focus
          </h3>
          <Target className="h-5 w-5 text-accent-success" aria-hidden />
        </div>
      </CardHeader>
      <CardBody className="flex-1 flex flex-col items-center justify-center gap-4">
        <ProgressRing
          percentage={goal?.percent ?? 0}
          size={88}
          strokeWidth={7}
          color="var(--accent-success)"
        />
        <div className="space-y-1.5 text-center w-full">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-text-secondary">
              <BookOpen className="h-3.5 w-3.5" aria-hidden />
              Chapters
            </span>
            <span className="font-semibold tabular-nums text-text-primary">
              {goal?.chaptersCompleted ?? 0}/{goal?.chaptersTarget ?? 3}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-text-secondary">
              <FileText className="h-3.5 w-3.5" aria-hidden />
              Quizzes
            </span>
            <span className="font-semibold tabular-nums text-text-primary">
              {goal?.quizzesCompleted ?? 0}/{goal?.quizzesTarget ?? 1}
            </span>
          </div>
          <p className="pt-1 text-[11px] text-text-muted">
            Evaluated on {summary?.streakWager.currentPktDate ?? "today"} PKT.
          </p>
        </div>
      </CardBody>
    </Card>
  );
}

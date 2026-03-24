"use client";

import { CheckCircle } from "@phosphor-icons/react";

import { motion, useReducedMotion } from "framer-motion";
import type { GoalProgress } from "@/lib/stats-metrics";
import { DashboardCard } from "@/components/foundation/dashboard-primitives";

type WeeklyGoalsProps = {
  goals: GoalProgress[];
};

interface GoalCardProps {
  goal: GoalProgress;
  index: number;
}

function GoalCard({ goal, index }: GoalCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const isComplete = goal.progressPercent >= 100;
  const fillColor = isComplete ? "var(--success)" : "var(--primary)";

  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.4,
        delay: prefersReducedMotion ? 0 : 0.1 + index * 0.1,
        ease: "easeOut",
      }}
    >
      <DashboardCard
        className="p-4 transition-shadow duration-150 hover:shadow-[var(--shadow-md)]"
        role="article"
        aria-label={`${goal.label}: ${goal.valueLabel}. ${goal.progressPercent} percent complete.`}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-foreground">{goal.label}</p>
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className="text-sm font-bold"
              style={{
                fontFamily: "var(--font-mono)",
                color: isComplete ? "var(--success)" : "var(--foreground)",
              }}
            >
              {goal.valueLabel}
            </span>
            {isComplete && (
              <CheckCircle
                className="h-4 w-4 text-[var(--success)]"
                weight="fill"
                aria-hidden
              />
            )}
          </div>
        </div>

        {/* Progress Bar - 8px height per spec */}
        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded bg-muted">
            <motion.div
              className="h-full rounded"
              style={{ backgroundColor: fillColor }}
              initial={prefersReducedMotion ? { width: `${goal.progressPercent}%` } : { width: 0 }}
              animate={{ width: `${Math.min(goal.progressPercent, 100)}%` }}
              transition={{ duration: 0.5, delay: 0.2 + index * 0.1, ease: "easeOut" }}
            />
            {/* Overflow indicator for >100% */}
            {goal.progressPercent > 100 && (
              <div
                className="absolute top-0 h-full rounded-r border-r-2 border-dashed"
                style={{
                  left: "100%",
                  width: `${Math.min((goal.progressPercent - 100) * 8, 16)}px`,
                  backgroundColor: "var(--success)",
                  opacity: 0.6,
                  marginLeft: "2px",
                }}
              />
            )}
          </div>
        </div>

        <p className="mt-2 text-xs text-muted-foreground">{goal.progressPercent}% complete</p>
      </DashboardCard>
    </motion.div>
  );
}

export function WeeklyGoals({ goals }: WeeklyGoalsProps) {
  if (goals.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Set up your learning goals to track weekly progress.
        </p>
      </div>
    );
  }

  const completedCount = goals.filter((g) => g.progressPercent >= 100).length;

  return (
    <div
      role="region"
      aria-label="Weekly goals"
      className="space-y-3"
    >
      {completedCount === goals.length && goals.length > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-md bg-success/10 px-3 py-2">
          <CheckCircle className="h-5 w-5 text-[var(--success)]" weight="fill" aria-hidden />
          <p className="text-sm font-medium text-foreground">All goals completed this week!</p>
        </div>
      )}

      {goals.map((goal, index) => (
        <GoalCard key={goal.label} goal={goal} index={index} />
      ))}
    </div>
  );
}

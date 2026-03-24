"use client";

import { CheckCircle, PlayCircle } from "@phosphor-icons/react";

import { motion, useReducedMotion } from "framer-motion";
import type { WeakSubjectPoint } from "@/lib/stats-metrics";
import { DashboardCard } from "@/components/foundation/dashboard-primitives";

type FocusAreasProps = {
  weakSubjects: WeakSubjectPoint[];
};

interface FocusAreaCardProps {
  subject: WeakSubjectPoint;
  index: number;
}

function FocusAreaCard({ subject, index }: FocusAreaCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const healthColor =
    subject.healthScore < 50 ? "var(--destructive)" : "var(--warning)";

  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: prefersReducedMotion ? 0 : index * 0.1,
        ease: "easeOut",
      }}
    >
      <DashboardCard
        className="group flex h-full flex-col p-5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]"
        role="article"
        aria-label={`${subject.subjectName} needs focus. Health score: ${subject.healthScore} percent. ${subject.chaptersVisitedPercent} percent chapters visited, ${subject.bestQuizScorePercent} percent best quiz score.`}
      >
        <div className="flex-1">
          <p className="text-base font-semibold text-foreground">{subject.subjectName}</p>

          {/* Health Score */}
          <div className="mt-4 flex items-center gap-3">
            <div className="relative">
              <svg width={56} height={56} className="-rotate-90">
                <circle
                  cx={28}
                  cy={28}
                  r={24}
                  fill="none"
                  stroke="var(--muted)"
                  strokeWidth={4}
                />
                <circle
                  cx={28}
                  cy={28}
                  r={24}
                  fill="none"
                  stroke={healthColor}
                  strokeWidth={4}
                  strokeLinecap="round"
                  strokeDasharray={`${(subject.healthScore / 100) * 150.8} 150.8`}
                  style={{ transition: "stroke-dasharray 0.6s ease-out" }}
                />
              </svg>
              <span
                className="absolute inset-0 flex items-center justify-center text-xl font-bold"
                style={{ fontFamily: "var(--font-mono)", color: healthColor }}
              >
                {subject.healthScore}
              </span>
            </div>
            <span className="text-sm font-medium text-muted-foreground">%</span>
          </div>

          {/* Metrics */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-[0.05em] text-muted-foreground">
                Chapters
              </span>
              <span className="text-sm font-medium" style={{ fontFamily: "var(--font-mono)" }}>
                {subject.chaptersVisitedPercent}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-[0.05em] text-muted-foreground">
                Quiz Score
              </span>
              <span className="text-sm font-medium" style={{ fontFamily: "var(--font-mono)" }}>
                {subject.bestQuizScorePercent}%
              </span>
            </div>
          </div>
        </div>

        {/* Study Now Button */}
        <button
          className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] text-sm font-semibold text-[var(--primary-foreground)] transition-colors duration-150 hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
          aria-label={`Study ${subject.subjectName} now`}
        >
          <PlayCircle className="h-5 w-5" weight="fill" aria-hidden />
          Study now
        </button>
      </DashboardCard>
    </motion.div>
  );
}

function PositiveConfirmationCard() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="col-span-full rounded-lg border border-success/30 bg-[--card] p-6 text-center"
      role="article"
      aria-label="All subjects are on track. Keep up your great work."
    >
      <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
        <CheckCircle className="h-8 w-8 text-[var(--success)]" weight="fill" aria-hidden />
      </div>
      <p className="text-lg font-semibold text-foreground">All subjects are on track!</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Keep up your great work. Consistent study sessions will maintain your health scores.
      </p>
    </motion.div>
  );
}

export function FocusAreas({ weakSubjects }: FocusAreasProps) {
  if (weakSubjects.length === 0) {
    return (
      <div
        role="region"
        aria-label="Focus areas requiring attention"
        className="grid grid-cols-1"
      >
        <PositiveConfirmationCard />
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Focus areas requiring attention"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {weakSubjects.map((subject, index) => (
        <FocusAreaCard key={subject.subjectId} subject={subject} index={index} />
      ))}
    </div>
  );
}

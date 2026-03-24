"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { DashboardSummaryResponse } from "@/lib/progress-api";
import { DashboardCard } from "@/components/foundation/dashboard-primitives";
import { EmptyState } from "@/components/ui/states";

type SubjectPerformanceGridProps = {
  subjects: DashboardSummaryResponse["subjects"];
  weakSubjectSlugs: Set<string>;
};

const formatDate = (isoDate: string | null): string => {
  if (!isoDate) {
    return "No activity yet";
  }

  return new Date(isoDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getHealthColor = (healthScore: number): string => {
  if (healthScore > 70) return "var(--success)";
  if (healthScore >= 50) return "var(--warning)";
  return "var(--destructive)";
};

const getBadgeStyles = (isWeak: boolean): { bg: string; text: string; border: string } => {
  if (isWeak) {
    return {
      bg: "#fef3c7",
      text: "#92400e",
      border: "#fde68a",
    };
  }
  return {
    bg: "#dcfce7",
    text: "#166534",
    border: "#bbf7d0",
  };
};

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color: string;
}

function ProgressRing({ progress, size = 48, strokeWidth = 4, color }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className="-rotate-90">
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--muted)"
        strokeWidth={strokeWidth}
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.6s ease-out" }}
      />
    </svg>
  );
}

interface SubjectCardProps {
  subject: DashboardSummaryResponse["subjects"][number];
  isWeak: boolean;
  index: number;
}

function SubjectCard({ subject, isWeak, index }: SubjectCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const healthScore = Math.round(
    (subject.chaptersVisitedPercent + subject.bestQuizScorePercent) / 2
  );
  const healthColor = getHealthColor(healthScore);
  const badgeStyles = getBadgeStyles(isWeak);

  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: prefersReducedMotion ? 0 : index * 0.05,
        ease: "easeOut",
      }}
    >
      <DashboardCard
        className="group p-4 transition-shadow duration-150 hover:shadow-[var(--shadow-md)]"
        role="listitem"
        aria-label={`${subject.subjectName}, health score ${healthScore} percent. ${subject.chaptersVisitedPercent} percent chapters visited, ${subject.bestQuizScorePercent} percent best quiz score.`}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-foreground">{subject.subjectName}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {subject.boardName} Grade {subject.grade}
            </p>
          </div>
          <span
            className="shrink-0 rounded-md border px-2 py-1 text-[11px] font-bold uppercase tracking-[0.05em]"
            style={{
              backgroundColor: badgeStyles.bg,
              color: badgeStyles.text,
              borderColor: badgeStyles.border,
            }}
          >
            {isWeak ? "Focus area" : "On track"}
          </span>
        </div>

        <div className="mt-4 flex items-center gap-4">
          {/* Health Score Ring */}
          <div className="relative">
            <ProgressRing progress={healthScore} size={48} strokeWidth={4} color={healthColor} />
            <span
              className="absolute inset-0 flex items-center justify-center text-sm font-bold"
              style={{ fontFamily: "var(--font-mono)", color: "var(--foreground)" }}
            >
              {healthScore}
            </span>
          </div>

          {/* Metrics */}
          <div className="flex-1 space-y-2.5">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Chapters</span>
                <span className="text-sm font-medium" style={{ fontFamily: "var(--font-mono)" }}>
                  {subject.chaptersVisitedPercent}%
                </span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-[var(--primary)]"
                  style={{ width: `${subject.chaptersVisitedPercent}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Quiz</span>
                <span className="text-sm font-medium" style={{ fontFamily: "var(--font-mono)" }}>
                  {subject.bestQuizScorePercent}%
                </span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-[var(--success)]"
                  style={{ width: `${subject.bestQuizScorePercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">Last active: {formatDate(subject.lastActiveAt)}</p>
      </DashboardCard>
    </motion.div>
  );
}

export function SubjectPerformanceGrid({ subjects, weakSubjectSlugs }: SubjectPerformanceGridProps) {
  if (subjects.length === 0) {
    return (
      <EmptyState
        title="No subjects enrolled yet"
        description="Add subjects to track your progress."
      />
    );
  }

  // Sort subjects by health score ascending (weakest first)
  const sortedSubjects = [...subjects].sort((a, b) => {
    const healthA = Math.round((a.chaptersVisitedPercent + a.bestQuizScorePercent) / 2);
    const healthB = Math.round((b.chaptersVisitedPercent + b.bestQuizScorePercent) / 2);
    return healthA - healthB || a.subjectName.localeCompare(b.subjectName);
  });

  return (
    <div
      role="list"
      aria-label="Subject performance overview"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
    >
      {sortedSubjects.map((subject, index) => (
        <SubjectCard
          key={subject.subjectId}
          subject={subject}
          isWeak={weakSubjectSlugs.has(subject.subjectSlug)}
          index={index}
        />
      ))}
    </div>
  );
}

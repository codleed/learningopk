"use client";

import { type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Brain,
  Dices,
  FileText,
  PlayCircle,
  Target,
  Clock,
} from "lucide-react";

import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LinearProgress } from "@/components/ui/progress";
import { SubjectBadge } from "@/components/common/subject-badge";
import { ProgressRing } from "@/components/common/progress-ring";
import { XPBar } from "@/components/common/xp-bar";
import { StreakCounter } from "@/components/common/streak-counter";
import { ReviewNowWidget } from "@/components/dashboard/review-now-widget";
import { AiMemoryCard } from "@/components/dashboard/ai-memory-card";
import type { DashboardSummaryResponse } from "@/lib/progress-api";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const fadeUpReduced = {
  hidden: { opacity: 1, y: 0 },
  show: { opacity: 1, y: 0 },
};

/* ------------------------------------------------------------------ */
/*  Reusable motion wrappers                                           */
/* ------------------------------------------------------------------ */

export function StaggerContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      variants={reduced ? undefined : containerVariants}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function MotionSection({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      variants={reduced ? fadeUpReduced : fadeUp}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function MotionCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      variants={reduced ? fadeUpReduced : fadeUp}
      whileHover={
        reduced ? undefined : { y: -4, transition: { duration: 0.2 } }
      }
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type SubjectSummary = DashboardSummaryResponse["subjects"][number];
type RecentActivity = DashboardSummaryResponse["recentActivity"];
type WeeklyActivity = DashboardSummaryResponse["weeklyActivity"];
type XpInfo = NonNullable<DashboardSummaryResponse["xp"]>;

export interface DashboardClientProps {
  /** Student display name */
  displayName: string;
  /** Summary data from server, null if fetch failed */
  summary: DashboardSummaryResponse | null;
  /** Error message if summary fetch failed */
  summaryError: string | null;
  /** Featured subject (highest progress) */
  featuredSubject: SubjectSummary | null;
  /** Continue learning href */
  continueHref: string | null;
  /** All subjects ordered by progress */
  orderedSubjects: SubjectSummary[];
  /** First chapter base path for quick actions */
  firstChapterBasePath: string | null;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const formatActivityTimestamp = (isoDate: string): string =>
  new Date(isoDate).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const toActivityLabel = (
  entry: DashboardSummaryResponse["recentActivity"][number]
): string => {
  if (entry.type === "chapter_visit") {
    return `Visited ${entry.subjectName}: ${entry.chapterTitle}`;
  }
  return `Quiz in ${entry.subjectName}: ${entry.chapterTitle} (${entry.percentage}%)`;
};

const getDayLabel = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });

const getActivityIntensityClass = (count: number): string => {
  if (count === 0) return "bg-bg-subtle";
  if (count <= 1) return "bg-accent-primary/20";
  if (count <= 3) return "bg-accent-primary/40";
  if (count <= 5) return "bg-accent-primary/60";
  return "bg-accent-primary/80";
};

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function ContinueLearningCard({
  subject,
  continueHref,
}: {
  subject: SubjectSummary | null;
  continueHref: string | null;
}) {
  if (!subject) {
    return (
      <Card variant="default" className="h-full">
        <CardHeader>
          <h3 className="font-[var(--font-display)] text-base font-bold text-text-primary">
            Continue Learning
          </h3>
        </CardHeader>
        <CardBody className="flex flex-col items-center justify-center gap-3 py-8">
          <BookOpen className="h-10 w-10 text-text-muted" aria-hidden />
          <p className="text-sm text-text-secondary text-center">
            Start a chapter to track your progress here.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card variant="default" className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h3 className="font-[var(--font-display)] text-base font-bold text-text-primary">
            Continue Learning
          </h3>
          <PlayCircle
            className="h-5 w-5 text-accent-primary"
            aria-hidden
          />
        </div>
      </CardHeader>
      <CardBody className="flex-1 flex flex-col justify-between gap-4">
        <div className="flex items-start gap-4">
          <ProgressRing
            percentage={subject.chaptersVisitedPercent}
            size={64}
            strokeWidth={5}
          />
          <div className="min-w-0 flex-1">
            <SubjectBadge name={subject.subjectName} size="sm" />
            <h4 className="mt-1.5 text-sm font-semibold text-text-primary leading-snug truncate">
              {subject.subjectName}
            </h4>
            <p className="mt-0.5 text-xs text-text-secondary">
              {subject.boardName} &middot; Class {subject.grade}
            </p>
          </div>
        </div>
        {continueHref ? (
          <Link href={continueHref} className="block">
            <Button
              variant="primary"
              size="sm"
              width="full"
              iconRight={<ArrowRight />}
            >
              Continue
            </Button>
          </Link>
        ) : (
          <Link href={`/dashboard/${subject.boardSlug}/${subject.grade}/${subject.subjectSlug}`} className="block">
            <Button
              variant="secondary"
              size="sm"
              width="full"
              iconRight={<ArrowRight />}
            >
              View Subject
            </Button>
          </Link>
        )}
      </CardBody>
    </Card>
  );
}

function StreakXPCard({
  streakDays,
  longestStreakDays,
  xp,
}: {
  streakDays: number;
  longestStreakDays: number;
  xp: XpInfo | null;
}) {
  return (
    <Card variant="default" className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <h3 className="font-[var(--font-display)] text-base font-bold text-text-primary">
          Streak & XP
        </h3>
      </CardHeader>
      <CardBody className="flex-1 flex flex-col justify-between gap-4">
        <div className="flex items-center justify-center">
          <StreakCounter count={streakDays} size="lg" />
        </div>
        {longestStreakDays > 0 && (
          <p className="text-center text-xs text-text-muted">
            Longest streak: {longestStreakDays} days
          </p>
        )}
        {xp ? (
          <div className="space-y-2">
            <XPBar
              currentXP={xp.xp}
              maxXP={xp.xp + xp.xpToNextLevel}
              level={xp.level}
            />
            <p className="text-center text-xs font-semibold text-accent-primary">
              Level {xp.level} {xp.levelName}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <Skeleton className="h-3 w-full rounded-full" />
            <Skeleton className="h-3 w-1/2 mx-auto rounded" />
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function TodaysGoalCard({
  summary,
}: {
  summary: DashboardSummaryResponse | null;
}) {
  // Calculate today's goal progress from recent activity
  const todayStr = new Date().toISOString().split("T")[0];
  const todaysActivities =
    summary?.recentActivity.filter((a) =>
      a.occurredAt.startsWith(todayStr ?? "")
    ) ?? [];

  const chaptersToday = todaysActivities.filter(
    (a) => a.type === "chapter_visit"
  ).length;
  const quizzesToday = todaysActivities.filter(
    (a) => a.type === "quiz_submit"
  ).length;

  // Daily goal: 3 chapters + 1 quiz
  const goalChapters = 3;
  const goalQuizzes = 1;
  const totalGoal = goalChapters + goalQuizzes;
  const totalDone = Math.min(chaptersToday, goalChapters) + Math.min(quizzesToday, goalQuizzes);
  const goalPercent = Math.round((totalDone / totalGoal) * 100);

  return (
    <Card variant="default" className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h3 className="font-[var(--font-display)] text-base font-bold text-text-primary">
            Today&apos;s Goal
          </h3>
          <Target className="h-5 w-5 text-accent-success" aria-hidden />
        </div>
      </CardHeader>
      <CardBody className="flex-1 flex flex-col items-center justify-center gap-4">
        <ProgressRing
          percentage={goalPercent}
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
              {chaptersToday}/{goalChapters}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-text-secondary">
              <FileText className="h-3.5 w-3.5" aria-hidden />
              Quizzes
            </span>
            <span className="font-semibold tabular-nums text-text-primary">
              {quizzesToday}/{goalQuizzes}
            </span>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function SubjectProgressGrid({
  subjects,
}: {
  subjects: SubjectSummary[];
}) {
  if (subjects.length === 0) {
    return (
      <Card variant="default">
        <CardHeader>
          <h3 className="font-[var(--font-display)] text-base font-bold text-text-primary">
            Subject Progress
          </h3>
        </CardHeader>
        <CardBody className="py-8 text-center">
          <BookOpen
            className="mx-auto h-10 w-10 text-text-muted"
            aria-hidden
          />
          <p className="mt-3 text-sm text-text-secondary">
            No subjects enrolled yet. Start learning to see your progress.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card variant="default">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="font-[var(--font-display)] text-base font-bold text-text-primary">
            Subject Progress
          </h3>
          <Badge variant="default" size="sm">
            {subjects.length} subject{subjects.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </CardHeader>
      <CardBody className="p-3 pt-0">
        <div className="grid gap-3 sm:grid-cols-2">
          {subjects.map((subject) => {
            const totalChapters = Math.round(
              subject.chaptersVisitedPercent > 0
                ? 100 / (subject.chaptersVisitedPercent / Math.max(1, Math.round(subject.chaptersVisitedPercent / 10)))
                : 10
            );
            const visitedChapters = Math.round(
              (subject.chaptersVisitedPercent / 100) * totalChapters
            );

            return (
              <Link
                key={subject.subjectId}
                href={`/dashboard/${subject.boardSlug}/${subject.grade}/${subject.subjectSlug}`}
                className="group block"
              >
                <div className="rounded-xl border border-border-default bg-bg-base p-4 transition-all duration-200 hover:border-accent-primary/30 hover:shadow-[var(--shadow-sm)]">
                  <div className="flex items-start justify-between gap-2">
                    <SubjectBadge name={subject.subjectName} size="sm" />
                    <span className="text-xs font-bold tabular-nums text-text-secondary">
                      {subject.chaptersVisitedPercent}%
                    </span>
                  </div>
                  <h4 className="mt-2.5 text-sm font-semibold text-text-primary truncate">
                    {subject.subjectName}
                  </h4>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    {subject.boardName} &middot; Class {subject.grade}
                  </p>
                  <div className="mt-3">
                    <LinearProgress
                      value={subject.chaptersVisitedPercent}
                      barSize="sm"
                      colorVariant={
                        subject.chaptersVisitedPercent >= 80
                          ? "success"
                          : subject.chaptersVisitedPercent >= 40
                            ? "primary"
                            : "warning"
                      }
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-text-muted">
                    {visitedChapters}/{totalChapters} chapters completed
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}

function QuickActionsCard({
  firstChapterBasePath,
}: {
  firstChapterBasePath: string | null;
}) {
  const actions = [
    {
      label: "Start Random Quiz",
      description: "Test your knowledge",
      icon: Dices,
      href: firstChapterBasePath
        ? `${firstChapterBasePath}?tab=quiz`
        : "/dashboard",
      variant: "primary" as const,
    },
    {
      label: "Open AI Tutor",
      description: "Get personalized help",
      icon: Brain,
      href: firstChapterBasePath
        ? `${firstChapterBasePath}?tab=exercises&ai=1`
        : "/dashboard",
      variant: "secondary" as const,
    },
    {
      label: "View Past Papers",
      description: "Practice with real exams",
      icon: FileText,
      href: firstChapterBasePath
        ? `${firstChapterBasePath}?tab=exercises`
        : "/dashboard",
      variant: "secondary" as const,
    },
  ];

  return (
    <Card variant="default" className="h-full flex flex-col">
      <CardHeader>
        <h3 className="font-[var(--font-display)] text-base font-bold text-text-primary">
          Quick Actions
        </h3>
      </CardHeader>
      <CardBody className="flex-1 flex flex-col gap-2.5 pt-0">
        {actions.map((action) => (
          <Link key={action.label} href={action.href} className="block">
            <Button
              variant={action.variant}
              size="md"
              width="full"
              iconLeft={<action.icon />}
              className="justify-start"
            >
              <span className="flex flex-col items-start">
                <span className="text-sm font-medium">{action.label}</span>
                <span
                  className={cn(
                    "text-[11px] font-normal",
                    action.variant === "primary"
                      ? "text-white/70"
                      : "text-text-muted"
                  )}
                >
                  {action.description}
                </span>
              </span>
            </Button>
          </Link>
        ))}
      </CardBody>
    </Card>
  );
}

function WeeklyActivityCard({
  weeklyActivity,
}: {
  weeklyActivity: WeeklyActivity;
}) {
  return (
    <Card variant="default">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="font-[var(--font-display)] text-base font-bold text-text-primary">
            Weekly Activity
          </h3>
          <Badge variant="default" size="sm">
            Last 7 days
          </Badge>
        </div>
      </CardHeader>
      <CardBody className="pt-0">
        {weeklyActivity.length > 0 ? (
          <div className="grid grid-cols-7 gap-2">
            {weeklyActivity.map((entry) => (
              <div key={entry.date} className="flex flex-col items-center gap-1.5">
                <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                  {getDayLabel(entry.date)}
                </span>
                <div
                  className={cn(
                    "flex h-12 w-full items-center justify-center rounded-lg border text-xs font-bold tabular-nums transition-colors",
                    entry.active
                      ? "border-accent-primary/20 text-accent-primary"
                      : "border-border-default text-text-muted"
                  )}
                  title={`${entry.date}: ${entry.activityCount} activities`}
                >
                  <div
                    className={cn(
                      "flex h-full w-full items-center justify-center rounded-lg",
                      getActivityIntensityClass(entry.activityCount)
                    )}
                  >
                    {entry.activityCount}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center">
            <Clock
              className="mx-auto h-8 w-8 text-text-muted"
              aria-hidden
            />
            <p className="mt-2 text-xs text-text-secondary">
              No activity data available yet.
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function RecentActivityCard({
  activity,
}: {
  activity: RecentActivity;
}) {
  return (
    <Card variant="default" className="h-full flex flex-col">
      <CardHeader>
        <h3 className="font-[var(--font-display)] text-base font-bold text-text-primary">
          Recent Activity
        </h3>
      </CardHeader>
      <CardBody className="flex-1 pt-0">
        {activity.length > 0 ? (
          <ul className="space-y-2">
            {activity.slice(0, 5).map((entry, index) => (
              <li
                key={`${entry.type}-${entry.occurredAt}-${index}`}
                className="rounded-lg border border-border-default bg-bg-base px-3 py-2.5 transition-colors hover:border-border-strong"
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={cn(
                      "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                      entry.type === "chapter_visit"
                        ? "bg-accent-primary/10 text-accent-primary"
                        : "bg-accent-success/10 text-accent-success"
                    )}
                  >
                    {entry.type === "chapter_visit" ? (
                      <BookOpen className="h-3.5 w-3.5" aria-hidden />
                    ) : (
                      <FileText className="h-3.5 w-3.5" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-text-primary leading-snug">
                      {toActivityLabel(entry)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-text-muted">
                      {formatActivityTimestamp(entry.occurredAt)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center py-8">
            <Clock
              className="h-8 w-8 text-text-muted"
              aria-hidden
            />
            <p className="mt-2 text-xs text-text-secondary">
              No recent activity. Start a chapter!
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading skeleton                                                   */
/* ------------------------------------------------------------------ */

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Top row skeleton */}
      <div className="grid gap-6 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-border-default bg-bg-surface p-5 space-y-4"
          >
            <Skeleton className="h-5 w-32" />
            <div className="flex items-center gap-3">
              <Skeleton variant="circular" className="h-16 w-16" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
      {/* Middle row skeleton */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-xl border border-border-default bg-bg-surface p-5 space-y-4">
          <Skeleton className="h-5 w-40" />
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((j) => (
              <div
                key={j}
                className="rounded-xl border border-border-default bg-bg-base p-4 space-y-3"
              >
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border-default bg-bg-surface p-5 space-y-3">
          <Skeleton className="h-5 w-32" />
          {[0, 1, 2].map((k) => (
            <Skeleton key={k} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
      {/* Bottom row skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border-default bg-bg-surface p-5 space-y-3">
          <Skeleton className="h-5 w-36" />
          <div className="grid grid-cols-7 gap-2">
            {[0, 1, 2, 3, 4, 5, 6].map((l) => (
              <Skeleton key={l} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border-default bg-bg-surface p-5 space-y-3">
          <Skeleton className="h-5 w-36" />
          {[0, 1, 2].map((m) => (
            <Skeleton key={m} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main DashboardClient component                                     */
/* ------------------------------------------------------------------ */

export function DashboardClient({
  displayName,
  summary,
  summaryError,
  featuredSubject,
  continueHref,
  orderedSubjects,
  firstChapterBasePath,
}: DashboardClientProps) {
  if (summaryError && !summary) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-accent-danger/30 bg-accent-danger/5 p-8 text-center">
          <h3 className="font-[var(--font-display)] text-lg font-bold text-text-primary">
            Progress data is temporarily unavailable
          </h3>
          <p className="mt-2 text-sm text-text-secondary">
            {summaryError} Ensure backend is running on http://localhost:3001.
          </p>
        </div>
      </div>
    );
  }

  if (!summary) {
    return <DashboardSkeleton />;
  }

  return (
    <StaggerContainer className="space-y-6">
      {/* ============================================================ */}
      {/*  TOP ROW: 3-column grid                                      */}
      {/* ============================================================ */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <MotionCard>
          <ContinueLearningCard
            subject={featuredSubject}
            continueHref={continueHref}
          />
        </MotionCard>

        <MotionCard>
          <StreakXPCard
            streakDays={summary.streakDays}
            longestStreakDays={summary.longestStreakDays}
            xp={summary.xp}
          />
        </MotionCard>

        <MotionCard className="md:col-span-2 lg:col-span-1">
          <TodaysGoalCard summary={summary} />
        </MotionCard>
      </div>

      {/* ============================================================ */}
      {/*  MIDDLE ROW: 2/3 + 1/3                                       */}
      {/* ============================================================ */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <MotionSection>
          <SubjectProgressGrid subjects={orderedSubjects} />
        </MotionSection>

        <div className="flex flex-col gap-6">
          <MotionSection>
            <ReviewNowWidget />
          </MotionSection>
          <MotionSection>
            <QuickActionsCard firstChapterBasePath={firstChapterBasePath} />
          </MotionSection>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  BOTTOM ROW: 2-column                                        */}
      {/* ============================================================ */}
      <div className="grid gap-6 lg:grid-cols-2">
        <MotionSection>
          <WeeklyActivityCard weeklyActivity={summary.weeklyActivity} />
        </MotionSection>

        <MotionSection>
          <RecentActivityCard activity={summary.recentActivity} />
        </MotionSection>
      </div>

      {/* ============================================================ */}
      {/*  AI MEMORY ROW                                                */}
      {/* ============================================================ */}
      <MotionSection>
        <AiMemoryCard />
      </MotionSection>
    </StaggerContainer>
  );
}

"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import {
  BarChart3,
  Calendar,
  Flame,
  Heart,
  ListChecks,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from "@/components/ui";
import { Alert } from "@/components/ui/alert";
import { LinearProgress } from "@/components/ui/progress";
import { SubjectBadge } from "@/components/common/subject-badge";
import { AppShell } from "@/components/foundation/app-shell";
import type { SessionPayload } from "@/lib/session";
import type { DashboardSummaryResponse } from "@/lib/progress-api";
import type {
  WeeklyStudyTrendPoint,
  QuizAccuracyPoint,
  WeakSubjectPoint,
  GoalProgress,
} from "@/lib/stats-metrics";

/* Dynamic chart imports — SSR disabled */
const WeeklyStudyTimeChart = dynamic(
  () =>
    import("@/components/stats/weekly-study-time-chart").then(
      (mod) => mod.WeeklyStudyTimeChart
    ),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

const SubjectTimeSplitChart = dynamic(
  () =>
    import("@/components/stats/subject-time-split-chart").then(
      (mod) => mod.SubjectTimeSplitChart
    ),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

const QuizAccuracyTrendChart = dynamic(
  () =>
    import("@/components/stats/quiz-accuracy-trend-chart").then(
      (mod) => mod.QuizAccuracyTrendChart
    ),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

const ActivityHeatmap = dynamic(
  () =>
    import("@/components/stats/activity-heatmap").then(
      (mod) => mod.ActivityHeatmap
    ),
  { ssr: false, loading: () => <ChartSkeleton height="180px" /> }
);

const PerformanceTable = dynamic(
  () =>
    import("@/components/stats/performance-table").then(
      (mod) => mod.PerformanceTable
    ),
  { ssr: false, loading: () => <ChartSkeleton height="240px" /> }
);

/* Skeleton for chart loading */
function ChartSkeleton({ height = "320px" }: { height?: string }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg bg-bg-subtle/50"
      style={{ height }}
    >
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
    </div>
  );
}

/* Stagger container */
const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
} as const;

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
} as const;

interface StatsPageClientProps {
  session: SessionPayload;
  summary: DashboardSummaryResponse | null;
  summaryError: string | null;
  weeklyStudyTrend: WeeklyStudyTrendPoint[];
  quizAccuracyTrend: QuizAccuracyPoint[];
  weakSubjects: WeakSubjectPoint[];
  goals: GoalProgress[];
  healthScore: number;
  activeDaysThisWeek: number;
  dateRangeStr: string;
}

export function StatsPageClient({
  session,
  summary,
  summaryError,
  weeklyStudyTrend,
  quizAccuracyTrend,
  weakSubjects,
  goals,
  healthScore,
  activeDaysThisWeek,
  dateRangeStr,
}: StatsPageClientProps) {
  return (
    <AppShell
      session={session}
      currentPath="/stats"
      contentClassName="max-w-[96rem] px-4 pb-12 pt-6 sm:px-6 lg:px-8"
    >
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        {/* Page Header */}
        <motion.div variants={fadeUp}>
          <PageHeader
            title="Your Statistics"
            subtitle={`Tracking your learning progress \u2022 ${dateRangeStr}`}
            breadcrumbs={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Statistics" },
            ]}
          />
        </motion.div>

        {summaryError ? (
          <motion.div variants={fadeUp}>
            <Alert variant="danger" title="Stats are temporarily unavailable">
              {summaryError} Ensure backend is running on http://localhost:3001.
            </Alert>
          </motion.div>
        ) : (
          <>
            {/* KPI Strip */}
            <motion.div variants={fadeUp}>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard
                  label="Current Streak"
                  value={summary?.streakDays ?? 0}
                  icon={Flame}
                  accentColor="var(--accent-warning)"
                  trend={
                    summary && summary.streakDays > 0
                      ? {
                          value: summary.streakDays,
                          direction: "up" as const,
                        }
                      : undefined
                  }
                />
                <StatCard
                  label="Health Score"
                  value={`${healthScore}%`}
                  icon={Heart}
                  accentColor="var(--accent-danger)"
                />
                <StatCard
                  label="Active Days"
                  value={`${activeDaysThisWeek}/5`}
                  icon={Calendar}
                  accentColor="var(--accent-success)"
                />
                <StatCard
                  label="Longest Streak"
                  value={summary?.longestStreakDays ?? 0}
                  icon={Trophy}
                  accentColor="var(--accent-primary)"
                />
              </div>
            </motion.div>

            {/* Row 1: Charts side by side */}
            <motion.div variants={fadeUp}>
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-primary/10">
                        <BarChart3 className="h-4 w-4 text-accent-primary" />
                      </div>
                      <div>
                        <CardTitle>Weekly Study Time</CardTitle>
                        <CardDescription>
                          Estimated hours from activity events
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardBody className="px-2 pb-2 pt-0">
                    <WeeklyStudyTimeChart data={weeklyStudyTrend} />
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-info/10">
                        <Target className="h-4 w-4 text-accent-info" />
                      </div>
                      <div>
                        <CardTitle>Subject Time Split</CardTitle>
                        <CardDescription>
                          Activity distribution across subjects
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardBody className="px-2 pb-2 pt-0">
                    <SubjectTimeSplitChart
                      subjects={summary?.subjects ?? []}
                    />
                  </CardBody>
                </Card>
              </div>
            </motion.div>

            {/* Row 2: Quiz Accuracy Trend */}
            <motion.div variants={fadeUp}>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-success/10">
                      <TrendingUp className="h-4 w-4 text-accent-success" />
                    </div>
                    <div>
                      <CardTitle>Quiz Accuracy Trend</CardTitle>
                      <CardDescription>
                        Your quiz scores over the last 30 days with moving
                        average
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardBody className="px-2 pb-2 pt-0">
                  <QuizAccuracyTrendChart data={quizAccuracyTrend} />
                </CardBody>
              </Card>
            </motion.div>

            {/* Row 3: Activity Calendar Heatmap */}
            <motion.div variants={fadeUp}>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-primary/10">
                      <Calendar className="h-4 w-4 text-accent-primary" />
                    </div>
                    <div>
                      <CardTitle>Activity Calendar</CardTitle>
                      <CardDescription>
                        Full year contribution view
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardBody>
                  <ActivityHeatmap
                    dailyActivity={summary?.dailyActivity ?? []}
                  />
                </CardBody>
              </Card>
            </motion.div>

            {/* Row 4: Performance Table */}
            <motion.div variants={fadeUp}>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-warning/10">
                      <ListChecks className="h-4 w-4 text-accent-warning" />
                    </div>
                    <div>
                      <CardTitle>Recent Quiz Attempts</CardTitle>
                      <CardDescription>
                        Your latest quiz performances and earned XP
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardBody className="pt-0">
                  <PerformanceTable
                    quizHistory={summary?.quizHistory ?? []}
                  />
                </CardBody>
              </Card>
            </motion.div>

            {/* Goals & Focus Areas row */}
            <motion.div variants={fadeUp}>
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Weekly Goals */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-primary/10">
                        <Zap className="h-4 w-4 text-accent-primary" />
                      </div>
                      <div>
                        <CardTitle>Weekly Goals</CardTitle>
                        <CardDescription>
                          Track your progress against weekly targets
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardBody>
                    {goals.length === 0 ? (
                      <p className="text-sm text-text-muted">
                        No goals data available.
                      </p>
                    ) : (
                      <div className="space-y-5">
                        {goals.map((goal) => (
                          <div key={goal.label} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium text-text-primary">
                                {goal.label}
                              </span>
                              <span className="tabular-nums text-text-secondary">
                                {goal.valueLabel}
                              </span>
                            </div>
                            <LinearProgress
                              value={goal.progressPercent}
                              colorVariant={
                                goal.progressPercent >= 100
                                  ? "success"
                                  : goal.progressPercent >= 50
                                    ? "primary"
                                    : "warning"
                              }
                              barSize="sm"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </CardBody>
                </Card>

                {/* Focus Areas */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-danger/10">
                        <Target className="h-4 w-4 text-accent-danger" />
                      </div>
                      <div>
                        <CardTitle>Focus Areas</CardTitle>
                        <CardDescription>
                          Subjects that need your attention
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardBody>
                    {weakSubjects.length === 0 ? (
                      <p className="text-sm text-text-muted">
                        Great job! No weak subjects detected.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {weakSubjects.map((subject) => (
                          <div
                            key={subject.subjectSlug}
                            className="flex items-center gap-4 rounded-lg border border-border-default/60 bg-bg-subtle/30 p-3 transition-colors hover:bg-bg-subtle/60"
                          >
                            <SubjectBadge
                              name={subject.subjectName}
                              size="sm"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 text-xs text-text-secondary">
                                <span>Coverage: {subject.chaptersVisitedPercent}%</span>
                                <span>Best Quiz: {subject.bestQuizScorePercent}%</span>
                              </div>
                              <div className="mt-1.5">
                                <LinearProgress
                                  value={subject.healthScore}
                                  colorVariant={
                                    subject.healthScore >= 60
                                      ? "warning"
                                      : "danger"
                                  }
                                  barSize="sm"
                                />
                              </div>
                            </div>
                            <span className="shrink-0 tabular-nums text-sm font-bold text-text-primary">
                              {subject.healthScore}%
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardBody>
                </Card>
              </div>
            </motion.div>
          </>
        )}
      </motion.div>
    </AppShell>
  );
}

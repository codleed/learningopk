"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Calendar,
  Flame,
  Heart,
  LayoutDashboard,
  ListChecks,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardBody,
  Tabs,
  TabList,
  TabTrigger,
  TabContent,
  Tooltip,
} from "@/components/ui";
import { Button } from "@/components/ui/button";
import { LinearProgress } from "@/components/ui/progress";
import { SubjectBadge } from "@/components/common/subject-badge";
import { AppShell } from "@/components/foundation/app-shell";
import { ErrorState, LoadingSkeleton } from "@/components/ui/states";
import { MetricLabel } from "@/components/stats/metric-label";
import type { SessionPayload } from "@/lib/session";
import type { DashboardSummaryResponse } from "@/lib/progress-api";
import type {
  WeeklyStudyTrendPoint,
  QuizAccuracyPoint,
  WeakSubjectPoint,
  GoalProgress,
} from "@/lib/stats-metrics";

/* ─── Dynamic chart imports — SSR disabled ─── */
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

/* ─── Skeleton for chart loading ─── */
function ChartSkeleton({ height = "320px" }: { height?: string }) {
  return (
    <div style={{ height }}>
      <LoadingSkeleton title="Loading chart" rows={4} variant="card" className="h-full" />
    </div>
  );
}

/* ─── Animation variants ─── */
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

/* ─── Tab configuration ─── */
const STATS_TABS = [
  {
    value: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    description: "Your key metrics, activity calendar, and weekly study trends at a glance.",
  },
  {
    value: "performance",
    label: "Performance",
    icon: TrendingUp,
    description: "Quiz accuracy trends, recent attempts, and how you spend time across subjects.",
  },
  {
    value: "subjects",
    label: "Subjects",
    icon: BookOpen,
    description: "Subject-level breakdowns, weekly goals, and areas that need your attention.",
  },
] as const;

type StatsTab = (typeof STATS_TABS)[number]["value"];

/* ─── Tab layout ID for animated indicator ─── */
const TAB_LAYOUT_ID = "stats-tab-indicator";

/* ═══════════════════════════════════════════════════════════════
   Props
   ═══════════════════════════════════════════════════════════════ */

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
  onRetry?: () => void;
}

/* ═══════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════ */

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
  onRetry,
}: StatsPageClientProps) {
  const [activeTab, setActiveTab] = useState<StatsTab>("overview");

  /* Derive the description for the active tab */
  const activeTabMeta = useMemo(
    () => STATS_TABS.find((t) => t.value === activeTab)!,
    [activeTab]
  );

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
        {/* ─── Page Header ─── */}
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
            <ErrorState
              title="Stats are temporarily unavailable"
              description="We couldn't load your stats right now. Please try again."
              onRetry={onRetry ?? (() => window.location.reload())}
              retryLabel="Retry"
            />
          </motion.div>
        ) : (
          <>
            {/* ─── KPI Strip (always visible above tabs) ─── */}
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
                  label={
                    <MetricLabel
                      label="Progress Index"
                      explanation="Proxy score based on chapter coverage and best quiz score. Range: 0-100."
                    />
                  }
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

            {/* ─── Tabbed Layout ─── */}
            <motion.div variants={fadeUp}>
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as StatsTab)}
              >
                {/* Tab bar — horizontally scrollable on mobile */}
                <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
                  <TabList
                    variant="underline"
                    aria-label="Statistics categories"
                    className="min-w-max"
                  >
                    {STATS_TABS.map((tab) => (
                      <TabTrigger
                        key={tab.value}
                        value={tab.value}
                        variant="underline"
                        layoutId={TAB_LAYOUT_ID}
                      >
                        <tab.icon className="h-4 w-4" aria-hidden="true" />
                        {tab.label}
                      </TabTrigger>
                    ))}
                  </TabList>
                </div>

                {/* Tab description — contextual hint below tab bar */}
                <p className="mt-2 text-sm text-text-secondary">
                  {activeTabMeta.description}
                </p>

                {/* ═══════════════════════════════════
                   Tab 1: Overview
                   ═══════════════════════════════════ */}
                <TabContent value="overview" className="mt-6 space-y-6">
                  {/* Activity Calendar Heatmap */}
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

                  {/* Weekly Study Time Chart */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-primary/10">
                          <BarChart3 className="h-4 w-4 text-accent-primary" />
                        </div>
                        <div>
                          <CardTitle>~Weekly Study Time</CardTitle>
                          <CardDescription>
                            Estimated from activity events (~25 min per event). Not directly measured.
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardBody className="px-2 pb-2 pt-0">
                      <WeeklyStudyTimeChart data={weeklyStudyTrend} />
                    </CardBody>
                  </Card>

                  {/* ─── Tab footer CTA ─── */}
                  <div className="flex items-center justify-center gap-2 pt-2 text-sm text-text-muted">
                    <span>Keep studying to improve these stats.</span>
                    <Link href="/subjects">
                      <Button variant="ghost" size="xs" iconRight={<ArrowRight />} disableAnimation>
                        Browse subjects
                      </Button>
                    </Link>
                  </div>
                </TabContent>

                {/* ═══════════════════════════════════
                   Tab 2: Performance
                   ═══════════════════════════════════ */}
                <TabContent value="performance" className="mt-6 space-y-6">
                  {/* Quiz Accuracy Trend */}
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

                  {/* Recent Quiz Attempts (Performance Table) */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-warning/10">
                          <ListChecks className="h-4 w-4 text-accent-warning" />
                        </div>
                        <div>
                          <CardTitle>Recent Quiz Attempts</CardTitle>
                          <CardDescription>
                            Your latest quiz scores. Time and XP values are estimated.
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardBody className="pt-0">
                      <PerformanceTable
                        quizHistory={summary?.quizHistory ?? []}
                        subjectRoutes={(summary?.subjects ?? []).map((s) => ({
                          subjectSlug: s.subjectSlug,
                          boardSlug: s.boardSlug,
                          grade: s.grade,
                        }))}
                      />
                    </CardBody>
                  </Card>

                  {/* Subject Time Split */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-info/10">
                          <Target className="h-4 w-4 text-accent-info" />
                        </div>
                        <div>
                          <CardTitle>Subject Time Split</CardTitle>
                          <CardDescription>
                            Coverage distribution across subjects based on chapters visited
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

                  {/* ─── Tab footer CTA ─── */}
                  <div className="flex items-center justify-center gap-2 pt-2 text-sm text-text-muted">
                    <span>Keep studying to improve these stats.</span>
                    <Link href="/subjects">
                      <Button variant="ghost" size="xs" iconRight={<ArrowRight />} disableAnimation>
                        Browse subjects
                      </Button>
                    </Link>
                  </div>
                </TabContent>

                {/* ═══════════════════════════════════
                   Tab 3: Subjects
                   ═══════════════════════════════════ */}
                <TabContent value="subjects" className="mt-6 space-y-6">
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
                          {weakSubjects.map((subject) => {
                            const subjectHref = subject.boardSlug && subject.grade
                              ? `/${subject.boardSlug}/${subject.grade}/${subject.subjectSlug}`
                              : "/subjects";

                            return (
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
                                <Tooltip
                                  content="Proxy score based on chapter coverage and best quiz score. Range: 0-100."
                                  side="left"
                                  delayDuration={200}
                                >
                                  <span className="shrink-0 cursor-default tabular-nums text-sm font-bold text-text-primary">
                                    {subject.healthScore}%
                                  </span>
                                </Tooltip>
                                <Link href={subjectHref} className="shrink-0">
                                  <Button
                                    variant="secondary"
                                    size="xs"
                                    iconRight={<ArrowRight />}
                                    disableAnimation
                                  >
                                    Start reviewing
                                  </Button>
                                </Link>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardBody>
                  </Card>

                  {/* Subject Breakdown — per-subject card grid */}
                  {(summary?.subjects ?? []).length > 0 && (
                    <Card>
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-info/10">
                            <BookOpen className="h-4 w-4 text-accent-info" />
                          </div>
                          <div>
                            <CardTitle>Subject Breakdown</CardTitle>
                            <CardDescription>
                              Chapter completion and quiz scores per subject
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardBody>
                        <div className="grid gap-4 sm:grid-cols-2">
                          {(summary?.subjects ?? []).map((subject) => {
                            const subjectHref = `/${subject.boardSlug}/${subject.grade}/${subject.subjectSlug}`;

                            return (
                              <div
                                key={subject.subjectId}
                                className="rounded-lg border border-border-default/60 bg-bg-subtle/20 p-4 transition-colors hover:bg-bg-subtle/40"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-text-primary">
                                      {subject.subjectName}
                                    </p>
                                    <p className="text-xs text-text-secondary">
                                      {subject.boardName} Grade {subject.grade}
                                    </p>
                                  </div>
                                  <SubjectBadge name={subject.subjectName} size="sm" />
                                </div>

                                <div className="mt-3 space-y-3">
                                  <div>
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-text-secondary">Chapter Completion</span>
                                      <span className="tabular-nums font-medium text-text-primary">
                                        {subject.chaptersVisitedPercent}%
                                      </span>
                                    </div>
                                    <div className="mt-1">
                                      <LinearProgress
                                        value={subject.chaptersVisitedPercent}
                                        colorVariant="primary"
                                        barSize="sm"
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-text-secondary">Best Quiz Score</span>
                                      <span className="tabular-nums font-medium text-text-primary">
                                        {subject.bestQuizScorePercent}%
                                      </span>
                                    </div>
                                    <div className="mt-1">
                                      <LinearProgress
                                        value={subject.bestQuizScorePercent}
                                        colorVariant={
                                          subject.bestQuizScorePercent >= 70
                                            ? "success"
                                            : subject.bestQuizScorePercent >= 40
                                              ? "warning"
                                              : "danger"
                                        }
                                        barSize="sm"
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-3 flex items-center justify-between gap-2">
                                  {subject.lastActiveAt ? (
                                    <p className="text-[11px] text-text-muted">
                                      Last active:{" "}
                                      {new Date(subject.lastActiveAt).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                      })}
                                    </p>
                                  ) : (
                                    <span />
                                  )}
                                  <Link href={subjectHref}>
                                    <Button
                                      variant="ghost"
                                      size="xs"
                                      iconRight={<ArrowRight />}
                                      disableAnimation
                                    >
                                      Study
                                    </Button>
                                  </Link>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardBody>
                    </Card>
                  )}

                  {/* ─── Tab footer CTA ─── */}
                  <div className="flex items-center justify-center gap-2 pt-2 text-sm text-text-muted">
                    <span>Keep studying to improve these stats.</span>
                    <Link href="/subjects">
                      <Button variant="ghost" size="xs" iconRight={<ArrowRight />} disableAnimation>
                        Browse subjects
                      </Button>
                    </Link>
                  </div>
                </TabContent>
              </Tabs>
            </motion.div>
          </>
        )}
      </motion.div>
    </AppShell>
  );
}

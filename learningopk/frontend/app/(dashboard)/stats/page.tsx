import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { DailyStreakHeatmap } from "@/components/stats/daily-streak-heatmap";
import { QuizAccuracyTrend } from "@/components/stats/quiz-accuracy-trend";
import { StatsGoals } from "@/components/stats/stats-goals";
import { SubjectProgressOverview } from "@/components/stats/subject-progress-overview";
import { WeeklyTrend } from "@/components/stats/weekly-trend";
import { AppShell } from "@/components/foundation/app-shell";
import { DashboardCard, DashboardSection, DashboardSurface } from "@/components/foundation/dashboard-primitives";
import {
  StaggerContainer,
  MotionSection,
} from "@/components/dashboard/DashboardClient";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { ErrorState } from "@/components/ui/states";
import { getDashboardSummary } from "@/lib/progress-api";
import { getServerSession } from "@/lib/session";
import {
  buildGoalProgress,
  buildQuizAccuracyTrend,
  buildWeeklyStudyTrend,
  countActiveDaysThisMonth,
  getWeakSubjects
} from "@/lib/stats-metrics";

export default async function StatsPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const result = await getDashboardSummary(cookieStore.toString())
    .then((data) => ({
      summary: data,
      error: null as string | null
    }))
    .catch((error: unknown) => ({
      summary: null,
      error: error instanceof Error ? error.message : "Unable to load stats."
    }));

  const summary = result.summary;
  const summaryError = result.error;

  const activeDaysThisMonth = summary ? countActiveDaysThisMonth(summary.dailyActivity) : 0;
  const weeklyStudyTrend = summary ? buildWeeklyStudyTrend(summary.dailyActivity) : [];
  const quizAccuracyTrend = summary ? buildQuizAccuracyTrend(summary.quizHistory) : [];
  const weakSubjects = summary ? getWeakSubjects(summary.subjects) : [];
  const weakSubjectSlugs = new Set(weakSubjects.map((item) => item.subjectSlug));
  const goals = summary ? buildGoalProgress(summary) : [];
  const recentNinetyDayEvents =
    summary?.dailyActivity.slice(-90).reduce((total, entry) => total + entry.count, 0) ?? 0;

  return (
    <AppShell session={session} currentPath="/stats" contentClassName="max-w-[96rem] px-3 pb-10 pt-3 sm:px-5 lg:px-6">
      <StaggerContainer className="space-y-6">
          <MotionSection>
            <DashboardSurface as="header" tone="hero" className="px-5 py-6 sm:px-7">
              <Breadcrumbs
                items={[
                  { label: "Dashboard", href: "/dashboard" },
                  { label: "Stats" },
                ]}
                className="mb-3"
              />
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--primary)]">Analytics</p>
              <h1 className="mt-2 text-3xl font-medium text-foreground sm:text-4xl">Stats</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Track streaks, subject performance, quiz consistency, and weekly goals.
              </p>
            </DashboardSurface>
          </MotionSection>

          {summaryError ? (
            <MotionSection>
              <ErrorState
                title="Stats are temporarily unavailable"
                description={`${summaryError} Ensure backend is running on http://localhost:3001.`}
              />
            </MotionSection>
          ) : null}

          <MotionSection>
            <DashboardSection title="Streak Overview" contentClassName="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <DashboardCard className="p-4">
                <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Current streak</p>
                <p className="mt-3 text-4xl font-light text-foreground">{summary?.streakDays ?? 0}</p>
                <p className="mt-1 text-xs text-muted-foreground">consecutive days</p>
              </DashboardCard>
              <DashboardCard className="p-4">
                <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Longest streak</p>
                <p className="mt-3 text-4xl font-light text-foreground">{summary?.longestStreakDays ?? 0}</p>
                <p className="mt-1 text-xs text-muted-foreground">days recorded</p>
              </DashboardCard>
              <DashboardCard className="p-4">
                <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Active days this month</p>
                <p className="mt-3 text-4xl font-light text-foreground">{activeDaysThisMonth}</p>
                <p className="mt-1 text-xs text-muted-foreground">days with activity</p>
              </DashboardCard>
              <DashboardCard className="p-4">
                <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Last 90 days</p>
                <p className="mt-3 text-4xl font-light text-foreground">{recentNinetyDayEvents}</p>
                <p className="mt-1 text-xs text-muted-foreground">activity events</p>
              </DashboardCard>
            </DashboardSection>
          </MotionSection>

          <MotionSection>
            <DashboardSection title="Daily Streak Heatmap">
              <DailyStreakHeatmap dailyActivity={summary?.dailyActivity ?? []} />
            </DashboardSection>
          </MotionSection>

          <MotionSection>
            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <DashboardSection title="Subject-wise Progress">
                <SubjectProgressOverview subjects={summary?.subjects ?? []} weakSubjectSlugs={weakSubjectSlugs} />
              </DashboardSection>
              <DashboardSection title="Goal Tracker">
                <StatsGoals goals={goals} />
              </DashboardSection>
            </div>
          </MotionSection>

          <MotionSection>
            <div className="grid gap-4 xl:grid-cols-2">
              <DashboardSection title="Weekly Study Time Trend" subtitle="Estimated from activity events">
                <WeeklyTrend points={weeklyStudyTrend} />
              </DashboardSection>
              <DashboardSection title="Quiz Accuracy Trend" subtitle="Moving average across recent attempts">
                <QuizAccuracyTrend points={quizAccuracyTrend} />
              </DashboardSection>
            </div>
          </MotionSection>

          {weakSubjects.length > 0 ? (
            <MotionSection>
              <DashboardSection title="Weak Subjects" subtitle="Lowest combined completion and quiz performance">
                <div className="grid gap-3 md:grid-cols-3">
                  {weakSubjects.map((subject) => (
                    <DashboardCard key={subject.subjectId} className="p-4">
                      <p className="text-base font-semibold text-foreground">{subject.subjectName}</p>
                      <p className="mt-3 text-xs uppercase tracking-[0.08em] text-muted-foreground">Health score</p>
                      <p className="mt-1 text-3xl font-light text-foreground">{subject.healthScore}%</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {subject.chaptersVisitedPercent}% chapters visited, {subject.bestQuizScorePercent}% best quiz
                      </p>
                    </DashboardCard>
                  ))}
                </div>
              </DashboardSection>
            </MotionSection>
          ) : null}
        </StaggerContainer>
    </AppShell>
  );
}

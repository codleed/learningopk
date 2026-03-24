import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ConsistencyCalendar } from "@/components/stats/stats-consistency-calendar";
import { QuizPerformanceChart } from "@/components/stats/stats-quiz-performance-chart";
import { FocusAreas } from "@/components/stats/stats-focus-areas";
import { HeroKpiStrip } from "@/components/stats/stats-hero-kpi-strip";
import { StudyVolumeChart } from "@/components/stats/stats-study-volume-chart";
import { SubjectPerformanceGrid } from "@/components/stats/stats-subject-performance-grid";
import { WeeklyGoals } from "@/components/stats/stats-weekly-goals";
import { AppShell } from "@/components/foundation/app-shell";
import { DashboardSection, DashboardSurface } from "@/components/foundation/dashboard-primitives";
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
  getWeakSubjects
} from "@/lib/stats-metrics";

const computeOverallHealthScore = (subjects: { chaptersVisitedPercent: number; bestQuizScorePercent: number }[]): number => {
  if (subjects.length === 0) return 0;
  const total = subjects.reduce((sum, s) => {
    return sum + Math.round((s.chaptersVisitedPercent + s.bestQuizScorePercent) / 2);
  }, 0);
  return Math.round(total / subjects.length);
};

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

  const weeklyStudyTrend = summary ? buildWeeklyStudyTrend(summary.dailyActivity) : [];
  const quizAccuracyTrend = summary ? buildQuizAccuracyTrend(summary.quizHistory) : [];
  const weakSubjects = summary ? getWeakSubjects(summary.subjects) : [];
  const weakSubjectSlugs = new Set(weakSubjects.map((item) => item.subjectSlug));
  const goals = summary ? buildGoalProgress(summary) : [];
  const healthScore = summary ? computeOverallHealthScore(summary.subjects) : 0;

  // Get active days this week from goals
  const activeDaysGoal = goals.find((g) => g.label.includes("Active study days"));
  const activeDaysThisWeek = activeDaysGoal
    ? parseInt(activeDaysGoal.valueLabel.split("/")[0], 10)
    : 0;
  const activeDaysTarget = activeDaysGoal
    ? parseInt(activeDaysGoal.valueLabel.split("/")[1], 10)
    : 5;

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
        ) : (
          <>
            {/* Hero KPI Strip */}
            <MotionSection>
              <HeroKpiStrip
                currentStreak={summary?.streakDays ?? 0}
                longestStreak={summary?.longestStreakDays ?? 0}
                healthScore={healthScore}
                activeDaysThisWeek={activeDaysThisWeek}
                activeDaysTarget={activeDaysTarget}
              />
            </MotionSection>

            {/* Consistency Calendar */}
            <MotionSection>
              <DashboardSection title="Daily Streak Heatmap" contentClassName="pt-2">
                <div data-testid="daily-streak-heatmap">
                  <ConsistencyCalendar dailyActivity={summary?.dailyActivity ?? []} />
                </div>
              </DashboardSection>
            </MotionSection>

            {/* Charts Row */}
            <MotionSection>
              <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <DashboardSection
                  title="Study Volume"
                  subtitle="Estimated from activity events"
                  contentClassName="pt-2"
                >
                  <StudyVolumeChart points={weeklyStudyTrend} />
                </DashboardSection>
                <DashboardSection
                  title="Quiz Performance"
                  subtitle="Moving average across recent attempts"
                  contentClassName="pt-2"
                >
                  <QuizPerformanceChart points={quizAccuracyTrend} />
                </DashboardSection>
              </div>
            </MotionSection>

            {/* Subject & Goals Row */}
            <MotionSection>
              <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <DashboardSection
                  title="Subject-wise Progress"
                  contentClassName="pt-2"
                >
                  <SubjectPerformanceGrid
                    subjects={summary?.subjects ?? []}
                    weakSubjectSlugs={weakSubjectSlugs}
                  />
                </DashboardSection>
                <DashboardSection title="Goal Tracker" contentClassName="pt-2">
                  <WeeklyGoals goals={goals} />
                </DashboardSection>
              </div>
            </MotionSection>

            {/* Focus Areas */}
            <MotionSection>
              <DashboardSection
                title="Focus Areas"
                subtitle="Subjects that need your attention"
                contentClassName="pt-2"
              >
                <FocusAreas weakSubjects={weakSubjects} />
              </DashboardSection>
            </MotionSection>
          </>
        )}
      </StaggerContainer>
    </AppShell>
  );
}

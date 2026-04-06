import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { StatsPageClient } from "@/components/stats/stats-page-client";
import { getDashboardSummary } from "@/lib/progress-api";
import { getServerSession } from "@/lib/session";
import {
  buildGoalProgress,
  buildQuizAccuracyTrend,
  buildWeeklyStudyTrend,
  getWeakSubjects,
} from "@/lib/stats-metrics";

const computeOverallHealthScore = (
  subjects: { chaptersVisitedPercent: number; bestQuizScorePercent: number }[]
): number => {
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
      error: null as string | null,
    }))
    .catch((error: unknown) => {
      console.error("[Stats]", error);
      return {
        summary: null,
        error: "We couldn't load your stats right now. Please try again.",
      };
    });

  const summary = result.summary;
  const summaryError = result.error;

  const weeklyStudyTrend = summary
    ? buildWeeklyStudyTrend(summary.dailyActivity)
    : [];
  const quizAccuracyTrend = summary
    ? buildQuizAccuracyTrend(summary.quizHistory)
    : [];
  const weakSubjects = summary ? getWeakSubjects(summary.subjects) : [];
  const goals = summary ? buildGoalProgress(summary) : [];
  const healthScore = summary
    ? computeOverallHealthScore(summary.subjects)
    : 0;

  const activeDaysGoal = goals.find((g) =>
    g.label.includes("Active study days")
  );
  const activeDaysThisWeek = activeDaysGoal
    ? parseInt(activeDaysGoal.valueLabel.split("/")[0], 10)
    : 0;

  /* Format date range for subtitle */
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dateRangeStr = `${thirtyDaysAgo.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} - ${now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;

  return (
    <StatsPageClient
      session={session}
      summary={summary}
      summaryError={summaryError}
      weeklyStudyTrend={weeklyStudyTrend}
      quizAccuracyTrend={quizAccuracyTrend}
      weakSubjects={weakSubjects}
      goals={goals}
      healthScore={healthScore}
      activeDaysThisWeek={activeDaysThisWeek}
      dateRangeStr={dateRangeStr}
    />
  );
}

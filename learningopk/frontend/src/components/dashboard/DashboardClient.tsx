"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { ErrorState } from "@/components/ui/states";
import { ReviewNowWidget } from "@/components/dashboard/review-now-widget";
import { AiMemoryCard } from "@/components/dashboard/ai-memory-card";
import { FocusAreasWidget, type FocusAreaItem } from "@/components/dashboard/focus-areas-widget";
import { SubjectWeakAreasCard } from "@/components/dashboard/subject-weak-areas-card";
import { StudyGroupsPanel } from "@/components/dashboard/study-groups-panel";
import { StarredFormulasWidget } from "@/components/dashboard/starred-formulas-widget";
import { ContinueLearningCard } from "@/components/dashboard/continue-learning-card";
import { StreakXPCard } from "@/components/dashboard/streak-xp-card";
import { TodaysGoalCard } from "@/components/dashboard/todays-goal-card";
import { SubjectProgressGrid } from "@/components/dashboard/subject-progress-grid";
import { QuickActionsCard } from "@/components/dashboard/quick-actions-card";
import { WeeklyActivityCard } from "@/components/dashboard/weekly-activity-card";
import { RecentActivityCard } from "@/components/dashboard/recent-activity-card";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import type { DashboardSummaryResponse } from "@/lib/progress-api";
import type { StudyGroupsListResponse } from "@/lib/study-groups-api";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type SubjectSummary = DashboardSummaryResponse["subjects"][number];

export interface DashboardClientProps {
  displayName: string;
  summary: DashboardSummaryResponse | null;
  summaryError: string | null;
  featuredSubject: SubjectSummary | null;
  continueHref: string | null;
  orderedSubjects: SubjectSummary[];
  firstChapterBasePath: string | null;
  focusAreas: FocusAreaItem[];
  studyGroups: StudyGroupsListResponse["groups"];
}

/* ------------------------------------------------------------------ */
/*  Main DashboardClient component                                     */
/* ------------------------------------------------------------------ */

export function DashboardClient({
  summary,
  summaryError,
  featuredSubject,
  continueHref,
  orderedSubjects,
  firstChapterBasePath,
  focusAreas,
  studyGroups,
}: DashboardClientProps) {
  const router = useRouter();

  const handleRetry = useCallback(() => {
    router.refresh();
  }, [router]);

  if (summaryError && !summary) {
    return (
      <ErrorState
        title="Progress data is temporarily unavailable"
        description="We couldn't load your dashboard data right now. Please try again in a moment."
        onRetry={handleRetry}
        retryLabel="Retry"
      />
    );
  }

  if (!summary) {
    return <DashboardSkeleton />;
  }

  const hasFocusAreas = focusAreas.length > 0;
  const hasStarredFormulas = summary.starredFormulas.length > 0;
  const hasWeakAreas = orderedSubjects.some((s) => s.weakAreas.length > 0);

  return (
    <div className="space-y-8">
      {/* ============================================================ */}
      {/*  HERO ZONE — Equal columns, no spanning                      */}
      {/* ============================================================ */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ContinueLearningCard
          subject={featuredSubject}
          continueHref={continueHref}
        />
        <StreakXPCard
          streakDays={summary.streakDays}
          longestStreakDays={summary.longestStreakDays}
          xp={summary.xp}
          summary={summary}
        />
        <TodaysGoalCard summary={summary} />
      </div>

      {/* ============================================================ */}
      {/*  MAIN CONTENT — Subject progress (full width)                */}
      {/* ============================================================ */}
      <SubjectProgressGrid subjects={orderedSubjects} />

      {/* ============================================================ */}
      {/*  INSIGHTS + SIDEBAR — Weak areas + Widgets                   */}
      {/* ============================================================ */}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3 items-start">
        <div className="xl:col-span-2">
          <SubjectWeakAreasCard subjects={orderedSubjects} />
        </div>

        <div className="flex flex-col gap-4">
          {hasFocusAreas ? (
            <FocusAreasWidget recommendations={focusAreas} />
          ) : null}
          <ReviewNowWidget />
        </div>
      </div>

      {/* ============================================================ */}
      {/*  WIDGETS ROW — Formulas, Quick Actions, AI Memory            */}
      {/* ============================================================ */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 items-start">
        {hasStarredFormulas ? (
          <StarredFormulasWidget formulas={summary.starredFormulas} />
        ) : null}
        <QuickActionsCard firstChapterBasePath={firstChapterBasePath} />
        <AiMemoryCard />
      </div>

      {/* ============================================================ */}
      {/*  ACTIVITY — Weekly heatmap + Recent timeline                  */}
      {/* ============================================================ */}
      <div className="grid gap-4 sm:grid-cols-2">
        <WeeklyActivityCard weeklyActivity={summary.weeklyActivity} />
        <RecentActivityCard activity={summary.recentActivity} />
      </div>

      {/* ============================================================ */}
      {/*  STUDY GROUPS — Full width at bottom                         */}
      {/* ============================================================ */}
      <StudyGroupsPanel groups={studyGroups} />
    </div>
  );
}

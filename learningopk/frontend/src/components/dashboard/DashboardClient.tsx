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
  /** Top weak-area recommendations */
  focusAreas: FocusAreaItem[];
  /** User study groups */
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

  return (
    <div className="space-y-10">
      {/* ============================================================ */}
      {/*  HERO ZONE — Primary actions & status at a glance            */}
      {/* ============================================================ */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="md:col-span-2 xl:col-span-1">
          <ContinueLearningCard
            subject={featuredSubject}
            continueHref={continueHref}
          />
        </div>

        <StreakXPCard
          streakDays={summary.streakDays}
          longestStreakDays={summary.longestStreakDays}
          xp={summary.xp}
          summary={summary}
        />

        <TodaysGoalCard summary={summary} />
      </div>

      {/* ============================================================ */}
      {/*  MAIN CONTENT — Subject progress + Weak areas                */}
      {/* ============================================================ */}
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <SubjectProgressGrid subjects={orderedSubjects} />
          <SubjectWeakAreasCard subjects={orderedSubjects} />
        </div>

        <div className="flex flex-col gap-6">
          {hasFocusAreas ? (
            <FocusAreasWidget recommendations={focusAreas} />
          ) : null}
          <ReviewNowWidget />
          {hasStarredFormulas ? (
            <StarredFormulasWidget formulas={summary.starredFormulas} />
          ) : null}
          <QuickActionsCard firstChapterBasePath={firstChapterBasePath} />
          <AiMemoryCard />
        </div>
      </div>

      {/* ============================================================ */}
      {/*  ACTIVITY — Weekly heatmap + Recent timeline                  */}
      {/* ============================================================ */}
      <div className="grid gap-6 lg:grid-cols-2">
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

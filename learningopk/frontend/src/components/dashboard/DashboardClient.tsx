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
import { StaggerContainer, MotionSection, MotionCard } from "@/components/motion";

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
/*  Section divider                                                    */
/* ------------------------------------------------------------------ */

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-2 pb-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
        {label}
      </span>
      <div className="h-px flex-1 bg-border-default" />
    </div>
  );
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
    <StaggerContainer className="space-y-8">
      {/* ============================================================ */}
      {/*  HERO ZONE — Primary actions & status at a glance            */}
      {/* ============================================================ */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr]">
        <MotionCard className="md:col-span-2 xl:col-span-1">
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
            summary={summary}
          />
        </MotionCard>

        <MotionCard>
          <TodaysGoalCard summary={summary} />
        </MotionCard>
      </div>

      {/* ============================================================ */}
      {/*  INSIGHTS — Weak areas, Focus, Progress                      */}
      {/* ============================================================ */}
      <MotionSection>
        <SectionLabel label="Your Learning" />
      </MotionSection>

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <MotionSection>
          <div className="space-y-5">
            <SubjectWeakAreasCard subjects={orderedSubjects} />
            <SubjectProgressGrid subjects={orderedSubjects} />
          </div>
        </MotionSection>

        <div className="flex flex-col gap-5">
          {hasFocusAreas ? (
            <MotionSection>
              <FocusAreasWidget recommendations={focusAreas} />
            </MotionSection>
          ) : null}
          <MotionSection>
            <ReviewNowWidget />
          </MotionSection>
          {hasStarredFormulas ? (
            <MotionSection>
              <StarredFormulasWidget formulas={summary.starredFormulas} />
            </MotionSection>
          ) : null}
          <MotionSection>
            <QuickActionsCard firstChapterBasePath={firstChapterBasePath} />
          </MotionSection>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  ACTIVITY — Weekly heatmap + Recent timeline                  */}
      {/* ============================================================ */}
      <MotionSection>
        <SectionLabel label="Activity" />
      </MotionSection>

      <div className="grid gap-5 lg:grid-cols-2">
        <MotionSection>
          <WeeklyActivityCard weeklyActivity={summary.weeklyActivity} />
        </MotionSection>

        <MotionSection>
          <RecentActivityCard activity={summary.recentActivity} />
        </MotionSection>
      </div>

      {/* ============================================================ */}
      {/*  PERSONALIZATION — AI Memory + Study Groups                   */}
      {/* ============================================================ */}
      <MotionSection>
        <SectionLabel label="Personalization" />
      </MotionSection>

      <MotionSection>
        <AiMemoryCard />
      </MotionSection>

      <MotionSection>
        <StudyGroupsPanel groups={studyGroups} />
      </MotionSection>
    </StaggerContainer>
  );
}

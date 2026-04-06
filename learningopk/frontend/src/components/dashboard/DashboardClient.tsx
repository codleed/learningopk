"use client";

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
  focusAreas,
  studyGroups,
}: DashboardClientProps) {
  if (summaryError && !summary) {
    return (
      <ErrorState
        title="Progress data is temporarily unavailable"
        description="We couldn't load your dashboard data right now. Please try again in a moment."
      />
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
            summary={summary}
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
          <div className="space-y-6">
            <SubjectWeakAreasCard subjects={orderedSubjects} />
            <SubjectProgressGrid subjects={orderedSubjects} />
          </div>
        </MotionSection>

        <div className="flex flex-col gap-6">
          {focusAreas.length > 0 ? (
            <MotionSection>
              <FocusAreasWidget recommendations={focusAreas} />
            </MotionSection>
          ) : null}
          <MotionSection>
            <ReviewNowWidget />
          </MotionSection>
          <MotionSection>
            <StarredFormulasWidget formulas={summary.starredFormulas} />
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

      <MotionSection>
        <StudyGroupsPanel groups={studyGroups} />
      </MotionSection>
    </StaggerContainer>
  );
}

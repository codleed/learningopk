"use client";

import dynamic from "next/dynamic";

import { PageHeader } from "@/components/common/page-header";
import { Calendar } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from "@/components/ui";
import { AppShell } from "@/components/foundation/app-shell";
import { ErrorState, LoadingSkeleton } from "@/components/ui/states";
import type { SessionPayload } from "@/lib/session";
import type { DashboardSummaryResponse } from "@/lib/progress-api";

/* ─── Dynamic chart imports — SSR disabled ─── */
const ActivityHeatmap = dynamic(
  () => import("@/components/stats/activity-heatmap").then((mod) => mod.ActivityHeatmap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[180px]">
        <LoadingSkeleton title="Loading calendar" rows={4} variant="card" className="h-full" />
      </div>
    ),
  }
);

/* ═══════════════════════════════════════════════════════════════
   Props
   ═══════════════════════════════════════════════════════════════ */

interface StatsPageClientProps {
  session: SessionPayload;
  summaryError: string | null;
  dailyActivity: DashboardSummaryResponse["dailyActivity"];
}

/* ═══════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════ */

export function StatsPageClient({ session, summaryError, dailyActivity }: StatsPageClientProps) {
  return (
    <AppShell
      session={session}
      currentPath="/stats"
      contentClassName="max-w-[96rem] px-4 pb-12 pt-6 sm:px-6 lg:px-8"
    >
      <PageHeader
        sticky
        stickyClassName="-mx-4 -mt-6 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8"
        title="Your Statistics"
        subtitle="Your study activity over the past year"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Statistics" }]}
      />

      {summaryError ? (
        <ErrorState
          title="Stats are temporarily unavailable"
          description="We couldn't load your stats right now. Please try again."
          onRetry={() => window.location.reload()}
          retryLabel="Retry"
        />
      ) : (
        /* ─── Streak History Calendar ─── */
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-primary/10">
                <Calendar className="h-4 w-4 text-accent-primary" />
              </div>
              <div>
                <CardTitle>Streak History</CardTitle>
                <CardDescription>Daily study activity over the past year</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <ActivityHeatmap dailyActivity={dailyActivity} />
          </CardBody>
        </Card>
      )}
    </AppShell>
  );
}

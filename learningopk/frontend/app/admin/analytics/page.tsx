import Link from "next/link";
import { cookies } from "next/headers";

import { AdminAnalyticsPanel } from "@/components/admin/admin-analytics-panel";
import { PageHeader } from "@/components/foundation/page-header";
import { getAdminAnalyticsOverview } from "@/lib/admin-api";

export default async function AdminAnalyticsPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const payload = await getAdminAnalyticsOverview({
    windowDays: 30,
    cookieHeader
  }).catch(() => ({
    windowDays: 30 as const,
    summary: {
      activeStudents: 0,
      quizAttempts: 0,
      averageQuizScorePercent: 0,
      threadsCreated: 0,
      openModerationFlags: 0,
      confusionEvents: 0
    },
    subjectPerformance: [],
    confusionByChapter: []
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Analytics"
        title="Analytics & Reporting"
        subtitle="Inspect learning and moderation health trends across recent activity windows."
        actions={
          <Link href="/admin" className="text-sm font-medium text-foreground underline underline-offset-4">
            Back to admin
          </Link>
        }
      />
      <AdminAnalyticsPanel initialPayload={payload} />
    </div>
  );
}

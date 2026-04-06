import Link from "next/link";
import { cookies } from "next/headers";

import { AdminCommandCenterPanel } from "@/components/admin/admin-command-center-panel";
import { AdminPageHeader } from "@/components/admin/page-header";
import { getAdminOverview } from "@/lib/admin-api";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const overviewPayload = await getAdminOverview({
    windowDays: 30,
    cookieHeader
  }).catch(() => ({
    windowDays: 30 as const,
    kpis: {
      openModerationFlags: 0,
      suspendedUsers: 0,
      failedAdminActionsLast24h: 0,
      notificationsSentInWindow: 0
    },
    alerts: {
      showHighPriorityBanner: false,
      reasons: []
    },
    recentActivity: []
  }));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Admin"
        title="Command Center"
        subtitle="Track operational risk, admin activity, and response priorities in real time."
        actions={
          <Link href="/admin/audit" className="text-sm font-medium text-text-primary underline underline-offset-4">
            Open operations log
          </Link>
        }
      />
      <AdminCommandCenterPanel initialPayload={overviewPayload} />
    </div>
  );
}


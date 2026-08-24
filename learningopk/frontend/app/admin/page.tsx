import { cookies } from "next/headers";

import { AdminCommandCenterPanel } from "@/components/admin/admin-command-center-panel";
import { ModeratorDashboardPanel } from "@/components/admin/moderator-dashboard-panel";
import { AdminPageHeader } from "@/components/admin/page-header";
import { getAdminOverview } from "@/lib/admin-api";
import { getServerSession } from "@/lib/session";

export default async function AdminPage() {
  const session = await getServerSession();
  const isModerator = session?.user.role === "moderator";

  if (isModerator) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Moderator"
          title="Dashboard"
          subtitle="Quick overview of moderation activity and pending actions."
        />
        <ModeratorDashboardPanel />
      </div>
    );
  }

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const overviewPayload = await getAdminOverview({
    windowDays: 30,
    cookieHeader,
  }).catch(() => ({
    windowDays: 30 as const,
    kpis: {
      openModerationFlags: 0,
      suspendedUsers: 0,
      failedAdminActionsLast24h: 0,
      notificationsSentInWindow: 0,
    },
    alerts: {
      showHighPriorityBanner: false,
      reasons: [],
    },
    recentActivity: [],
  }));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Admin"
        title="Command Center"
        subtitle="Track operational risk, admin activity, and response priorities in real time."
        actions={null}
      />
      <AdminCommandCenterPanel initialPayload={overviewPayload} />
    </div>
  );
}

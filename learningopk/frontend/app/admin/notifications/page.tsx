import Link from "next/link";
import { cookies } from "next/headers";

import { AdminNotificationsPanel } from "@/components/admin/admin-notifications-panel";
import { AdminPageHeader } from "@/components/admin/page-header";
import { getAdminNotifications } from "@/lib/admin-api";

export default async function AdminNotificationsPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const payload = await getAdminNotifications({
    page: 1,
    pageSize: 10,
    cookieHeader,
  }).catch(() => ({
    entries: [],
    total: 0,
    page: 1,
    pageSize: 10,
    hasMore: false,
  }));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Admin Notifications"
        title="Notifications"
        subtitle="Broadcast operational messages and review recent sends."
        actions={
          <Link
            href="/admin"
            className="text-sm font-medium text-text-primary underline underline-offset-4"
          >
            Back to admin
          </Link>
        }
      />
      <AdminNotificationsPanel initialPayload={payload} />
    </div>
  );
}

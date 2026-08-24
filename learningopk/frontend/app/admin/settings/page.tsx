import Link from "next/link";
import { cookies } from "next/headers";

import { AdminSettingsPanel } from "@/components/admin/admin-settings-panel";
import { AdminPageHeader } from "@/components/admin/page-header";
import { getAdminSettings } from "@/lib/admin-api";

export default async function AdminSettingsPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const payload = await getAdminSettings({
    page: 1,
    pageSize: 20,
    cookieHeader,
  }).catch(() => ({
    entries: [],
    total: 0,
    page: 1,
    pageSize: 20,
    hasMore: false,
  }));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Admin Settings"
        title="System Settings"
        subtitle="Manage allowlisted platform defaults and operational flags."
        actions={
          <Link
            href="/admin"
            className="text-sm font-medium text-text-primary underline underline-offset-4"
          >
            Back to admin
          </Link>
        }
      />
      <AdminSettingsPanel initialPayload={payload} />
    </div>
  );
}

import Link from "next/link";
import { cookies } from "next/headers";

import { AdminContentPanel } from "@/components/admin/admin-content-panel";
import { PageHeader } from "@/components/foundation/page-header";
import { getAdminContentAuditLogs, getAdminContentChapters } from "@/lib/admin-api";

export default async function AdminContentPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const chapters = await getAdminContentChapters(cookieHeader).catch(() => []);
  const contentAuditLogs = await getAdminContentAuditLogs({
    page: 1,
    pageSize: 10,
    cookieHeader
  }).catch(() => ({
    entries: [],
    total: 0,
    page: 1,
    pageSize: 10,
    hasMore: false
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Content"
        title="Chapter Publishing"
        subtitle="Manage chapter visibility and log moderation attempts."
        actions={
          <Link href="/admin" className="text-sm font-medium text-foreground underline underline-offset-4">
            Back to admin
          </Link>
        }
      />
      <AdminContentPanel
        chapters={chapters}
        initialAuditEntries={contentAuditLogs.entries}
        initialAuditTotal={contentAuditLogs.total}
      />
    </div>
  );
}

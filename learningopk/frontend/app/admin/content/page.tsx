import Link from "next/link";
import { cookies } from "next/headers";

import { AdminContentPanel } from "@/components/admin/admin-content-panel";
import { AdminGuard } from "@/components/admin/admin-guard";
import { AppShell } from "@/components/foundation/app-shell";
import { PageHeader } from "@/components/foundation/page-header";
import { getAdminContentAuditLogs, getAdminContentChapters } from "@/lib/admin-api";
import { getServerSession } from "@/lib/session";

export default async function AdminContentPage() {
  const session = await getServerSession();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const chapters =
    session?.user.role === "admin"
      ? await getAdminContentChapters(cookieHeader).catch(() => [])
      : [];
  const contentAuditLogs =
    session?.user.role === "admin"
      ? await getAdminContentAuditLogs({
          page: 1,
          pageSize: 10,
          cookieHeader
        }).catch(() => ({
          entries: [],
          total: 0,
          page: 1,
          pageSize: 10,
          hasMore: false
        }))
      : {
          entries: [],
          total: 0,
          page: 1,
          pageSize: 10,
          hasMore: false
        };

  return (
    <AppShell session={session} currentPath="/admin/content">
      <AdminGuard session={session}>
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
      </AdminGuard>
    </AppShell>
  );
}

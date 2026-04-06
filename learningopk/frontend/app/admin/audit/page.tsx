import Link from "next/link";
import { cookies } from "next/headers";

import { AdminAuditPanel } from "@/components/admin/admin-audit-panel";
import { AdminPageHeader } from "@/components/admin/page-header";
import { getAdminAuditLogs } from "@/lib/admin-api";

export default async function AdminAuditPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const payload = await getAdminAuditLogs({
    scope: "all",
    status: "all",
    q: "",
    page: 1,
    pageSize: 20,
    cookieHeader
  }).catch(() => ({
    entries: [],
    total: 0,
    page: 1,
    pageSize: 20,
    hasMore: false
  }));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Admin Audit"
        title="Audit Trail"
        subtitle="Review admin actions across all operational scopes with unified filtering."
        actions={
          <Link href="/admin" className="text-sm font-medium text-text-primary underline underline-offset-4">
            Back to admin
          </Link>
        }
      />
      <AdminAuditPanel initialEntries={payload.entries} initialTotal={payload.total} />
    </div>
  );
}

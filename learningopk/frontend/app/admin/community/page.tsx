import Link from "next/link";
import { cookies } from "next/headers";

import { AdminCommunityPanel } from "@/components/admin/admin-community-panel";
import { PageHeader } from "@/components/foundation/page-header";
import { getAdminCommunityThreads } from "@/lib/admin-api";

export default async function AdminCommunityPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const payload = await getAdminCommunityThreads({
    page: 1,
    pageSize: 20,
    solved: "all",
    pinned: "all",
    flagState: "all",
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
      <PageHeader
        eyebrow="Admin Community"
        title="Community Forum"
        subtitle="Track thread health and moderation pressure across the forum."
        actions={
          <Link href="/admin" className="text-sm font-medium text-foreground underline underline-offset-4">
            Back to admin
          </Link>
        }
      />
      <AdminCommunityPanel initialEntries={payload.entries} initialTotal={payload.total} />
    </div>
  );
}

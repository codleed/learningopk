import Link from "next/link";
import { cookies } from "next/headers";

import { AdminModerationPanel } from "@/components/admin/admin-moderation-panel";
import { AdminPageHeader } from "@/components/admin/page-header";
import { getAdminModerationFlags } from "@/lib/admin-api";

export default async function AdminModerationPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const moderationPayload = await getAdminModerationFlags({
    page: 1,
    pageSize: 10,
    status: "open",
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
      <AdminPageHeader
        eyebrow="Admin Moderation"
        title="Flagging & Moderation"
        subtitle="Resolve reported content and review outcomes by status and target type."
        actions={
          <Link href="/admin" className="text-sm font-medium text-text-primary underline underline-offset-4">
            Back to admin
          </Link>
        }
      />
      <AdminModerationPanel initialEntries={moderationPayload.entries} initialTotal={moderationPayload.total} />
    </div>
  );
}

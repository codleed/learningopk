import Link from "next/link";
import { cookies } from "next/headers";

import { AdminForumPanel } from "@/components/admin/admin-forum-panel";
import { PageHeader } from "@/components/foundation/page-header";
import { getAdminForumAuditLogs } from "@/lib/admin-api";
import { getForumThreads } from "@/lib/forum-api";

export default async function AdminForumPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const feed = await getForumThreads({ limit: 50 }).catch(() => ({ threads: [] }));
  const forumAuditLogs = await getAdminForumAuditLogs({
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

  const rows = feed.threads.map((thread) => ({
    id: thread.id,
    title: thread.title,
    userName: thread.userName,
    createdAt: thread.createdAt,
    replyCount: thread.replyCount,
    views: thread.views,
    isPinned: thread.isPinned,
    isSolved: thread.isSolved
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Forum"
        title="Forum Moderation"
        subtitle="Prioritize important threads with pin controls and audit logs."
        actions={
          <Link href="/admin" className="text-sm font-medium text-foreground underline underline-offset-4">
            Back to admin
          </Link>
        }
      />
      <AdminForumPanel
        threads={rows}
        initialAuditEntries={forumAuditLogs.entries}
        initialAuditTotal={forumAuditLogs.total}
      />
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { z } from "zod";
import { ArrowLeft, Eye, Clock, MessageSquare } from "lucide-react";

import { AppShell } from "@/components/foundation/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { SubjectBadge } from "@/components/common/subject-badge";
import { BoardBadge } from "@/components/common/board-badge";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ContentRenderer } from "@/components/common/content-renderer";
import { ForumReplyForm } from "@/components/forum/forum-reply-form";
import { ForumReplyList } from "@/components/forum/forum-reply-list";
import { ForumThreadViewTracker } from "@/components/forum/forum-thread-view-tracker";
import { ForumThreadVoteControls } from "@/components/forum/forum-thread-vote-controls";
import { getForumThreadById } from "@/lib/forum-api";
import { getServerSession } from "@/lib/session";

const threadParamsSchema = z.object({
  threadId: z.string().uuid(),
});

type ForumThreadDetailPageProps = {
  params: Promise<{
    threadId: string;
  }>;
};

const formatDateTime = (value: string): string =>
  new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const formatRelativeTime = (value: string): string => {
  const now = Date.now();
  const date = new Date(value).getTime();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 30) {
    return formatDateTime(value);
  }
  if (days > 0) {
    return `${days}d ago`;
  }
  if (hours > 0) {
    return `${hours}h ago`;
  }
  if (minutes > 0) {
    return `${minutes}m ago`;
  }
  return "just now";
};

export default async function ForumThreadDetailPage({ params }: ForumThreadDetailPageProps) {
  const parsedParams = threadParamsSchema.safeParse(await params);
  if (!parsedParams.success) {
    notFound();
  }

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const [session, threadPayload] = await Promise.all([
    getServerSession(),
    getForumThreadById(parsedParams.data.threadId, { cookieHeader }),
  ]);

  if (!threadPayload) {
    notFound();
  }

  const { thread } = threadPayload;
  const canMarkAccepted = Boolean(session && session.user.id === thread.userId);
  const isAuthenticated = Boolean(session);

  return (
    <AppShell session={session} currentPath="/forum">
      <div className="space-y-6">
        {/* View tracker — fires once on client mount, never re-fires on router.refresh() */}
        <ForumThreadViewTracker threadId={thread.id} />
        {/* ── Page Header with breadcrumbs ── */}
        <PageHeader
          sticky
          stickyClassName="-mx-4 -mt-6 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8"
          title={thread.title}
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Forum", href: "/forum" },
            { label: thread.title.length > 50 ? `${thread.title.slice(0, 50)}...` : thread.title },
          ]}
          badge={
            <Badge variant={thread.isSolved ? "success" : "warning"} size="lg">
              {thread.isSolved ? "Solved" : "Unsolved"}
            </Badge>
          }
          actions={
            <Link href="/forum">
              <Button variant="ghost" size="sm" iconLeft={<ArrowLeft />}>
                Back to Forum
              </Button>
            </Link>
          }
        />

        {/* ── Original Post ── */}
        <article className="rounded-2xl border border-border-default bg-bg-surface overflow-hidden">
          {/* Post metadata strip */}
          <div className="flex flex-wrap items-center gap-2 border-b border-border-default bg-bg-subtle/50 px-6 py-3">
            {thread.isPinned ? (
              <Badge variant="info" size="sm">
                Pinned
              </Badge>
            ) : null}
            {thread.subjectName ? <SubjectBadge name={thread.subjectName} size="sm" /> : null}
            {thread.boardName ? <BoardBadge board={thread.boardName} size="sm" /> : null}
            {thread.className ? (
              <Badge variant="default" size="sm">
                Class {thread.className}
              </Badge>
            ) : null}
          </div>

          {/* Post content area */}
          <div className="p-6">
            {/* Author info row */}
            <div className="flex items-start gap-4">
              <Avatar name={thread.userName} size="lg" className="shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-sm font-bold text-text-primary">
                    {thread.userName}
                  </span>
                  <span className="text-xs text-text-muted">asked</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    {formatRelativeTime(thread.createdAt)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-3 w-3" aria-hidden="true" />
                    {thread.views} views
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" aria-hidden="true" />
                    {thread.replyCount} {thread.replyCount === 1 ? "reply" : "replies"}
                  </span>
                </div>
              </div>
            </div>

            {/* Thread body */}
            <div className="mt-6 rounded-xl border border-border-default bg-bg-base/50 p-5">
              <ContentRenderer content={thread.body} />
            </div>

            {/* Vote controls */}
            <ForumThreadVoteControls threadId={thread.id} />
          </div>
        </article>

        {/* ── Reply Section ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold tracking-tight text-text-primary">
              {thread.replyCount} {thread.replyCount === 1 ? "Reply" : "Replies"}
            </h2>
          </div>

          {/* Reply editor */}
          {isAuthenticated ? (
            <ForumReplyForm threadId={thread.id} />
          ) : (
            <div className="rounded-xl border border-dashed border-border-default bg-bg-subtle/50 p-5 text-center">
              <p className="text-sm text-text-secondary">
                <Link
                  href="/login"
                  className="font-semibold text-accent-primary underline underline-offset-4 transition-colors hover:text-accent-primary-hover"
                >
                  Sign in
                </Link>{" "}
                to post a reply.
              </p>
            </div>
          )}

          {/* Reply list */}
          <ForumReplyList
            threadId={thread.id}
            replies={thread.replies}
            canMarkAccepted={canMarkAccepted}
            isAuthenticated={isAuthenticated}
          />
        </div>
      </div>
    </AppShell>
  );
}

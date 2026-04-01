import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { SubjectBadge } from "@/components/common/subject-badge";
import { BoardBadge } from "@/components/common/board-badge";
import { Eye, MessageSquare, Clock, Pin } from "lucide-react";
import type { ForumThreadDetailResponse } from "@/lib/forum-api";

type Thread = ForumThreadDetailResponse["thread"];

const formatDateTime = (value: string): string =>
  new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
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

type ForumThreadHeaderProps = {
  thread: Thread;
};

export function ForumThreadHeader({ thread }: ForumThreadHeaderProps) {
  return (
    <header className="rounded-2xl border border-border-default bg-bg-surface overflow-hidden">
      {/* Badge strip */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border-default bg-bg-subtle/50 px-6 py-3">
        {thread.isPinned ? (
          <Badge variant="info" size="sm">
            <Pin className="h-2.5 w-2.5" aria-hidden="true" />
            Pinned
          </Badge>
        ) : null}
        <Badge variant={thread.isSolved ? "success" : "warning"} size="sm">
          {thread.isSolved ? "Solved" : "Unsolved"}
        </Badge>
        {thread.subjectName ? <SubjectBadge name={thread.subjectName} size="sm" /> : null}
        {thread.boardName ? <BoardBadge board={thread.boardName} size="sm" /> : null}
        {thread.className ? (
          <Badge variant="default" size="sm">Class {thread.className}</Badge>
        ) : null}
      </div>

      {/* Title and metadata */}
      <div className="p-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
          {thread.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-text-muted">
          <span className="inline-flex items-center gap-2">
            <Avatar name={thread.userName} size="sm" />
            <span className="font-medium text-text-secondary">
              Asked by {thread.userName}
            </span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {formatRelativeTime(thread.createdAt)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            {thread.views} views
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
            {thread.replyCount} replies
          </span>
        </div>
      </div>
    </header>
  );
}

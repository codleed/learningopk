import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { ForumFeedResponse } from "@/lib/forum-api";

type Thread = ForumFeedResponse["threads"][number];

const formatDateTime = (value: string): string =>
  new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });

const toExcerpt = (markdown: string): string => {
  const clean = markdown
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/[`*_>#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (clean.length <= 190) {
    return clean;
  }

  return `${clean.slice(0, 187)}...`;
};

type ForumThreadCardProps = {
  thread: Thread;
};

export function ForumThreadCard({ thread }: ForumThreadCardProps) {
  return (
    <Link
      href={`/forum/${thread.id}`}
      prefetch={false}
      className="surface-card block rounded-xl border border-border p-5 transition hover:-translate-y-0.5 hover:border-primary/45"
    >
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {thread.isPinned ? <Badge variant="info">Pinned</Badge> : null}
        <Badge variant={thread.isSolved ? "success" : "warning"}>{thread.isSolved ? "Solved" : "Unsolved"}</Badge>
        {thread.boardName ? <span className="text-muted-foreground">{thread.boardName}</span> : null}
        {thread.grade ? <span className="text-muted-foreground">Grade {thread.grade}</span> : null}
        {thread.subjectName ? <span className="text-muted-foreground">{thread.subjectName}</span> : null}
      </div>

      <h2 className="mt-2 text-xl font-semibold text-foreground">{thread.title}</h2>
      <p className="mt-2 text-sm text-foreground/90">{toExcerpt(thread.body)}</p>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>By {thread.userName}</span>
        <span>{formatDateTime(thread.createdAt)}</span>
        <span>{thread.replyCount} replies</span>
        <span>{thread.views} views</span>
      </div>
    </Link>
  );
}


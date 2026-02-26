import { Badge } from "@/components/ui/badge";
import type { ForumThreadDetailResponse } from "@/lib/forum-api";

type Thread = ForumThreadDetailResponse["thread"];

const formatDateTime = (value: string): string =>
  new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });

type ForumThreadHeaderProps = {
  thread: Thread;
};

export function ForumThreadHeader({ thread }: ForumThreadHeaderProps) {
  return (
    <header className="surface-card rounded-2xl border border-border p-6">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant={thread.isSolved ? "success" : "warning"}>{thread.isSolved ? "Solved" : "Unsolved"}</Badge>
        {thread.isPinned ? <Badge variant="info">Pinned</Badge> : null}
        {thread.boardName ? <span className="text-muted-foreground">{thread.boardName}</span> : null}
        {thread.grade ? <span className="text-muted-foreground">Grade {thread.grade}</span> : null}
        {thread.subjectName ? <span className="text-muted-foreground">{thread.subjectName}</span> : null}
      </div>

      <h1 className="mt-2 text-3xl font-semibold text-foreground">{thread.title}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>Asked by {thread.userName}</span>
        <span>{formatDateTime(thread.createdAt)}</span>
        <span>{thread.views} views</span>
        <span>{thread.replyCount} replies</span>
      </div>
    </header>
  );
}


import { MessageSquareOff } from "lucide-react";

import type { ForumFeedResponse } from "@/lib/forum-api";
import { EmptyState } from "@/components/ui/states";

import { ForumThreadCard } from "./forum-thread-card";

type ForumThreadListProps = {
  threads: ForumFeedResponse["threads"];
};

export function ForumThreadList({ threads }: ForumThreadListProps) {
  if (threads.length === 0) {
    return (
      <EmptyState
        title="No threads found"
        description="Try adjusting your filters or be the first to start a discussion."
        icon={<MessageSquareOff className="h-5 w-5" aria-hidden="true" />}
      />
    );
  }

  return (
    <section className="space-y-2" aria-label="Thread list">
      {threads.map((thread, index) => (
        <ForumThreadCard key={thread.id} thread={thread} index={index} />
      ))}
    </section>
  );
}

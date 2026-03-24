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
        description="Try adjusting your filters or start a new question."
      />
    );
  }

  return (
    <section className="space-y-4">
      {threads.map((thread) => (
        <ForumThreadCard key={thread.id} thread={thread} />
      ))}
    </section>
  );
}


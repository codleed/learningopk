import Link from "next/link";
import { TrendingUp, Crown } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import type { ForumFeedResponse } from "@/lib/forum-api";

type ForumTrendingSidebarProps = {
  threads: ForumFeedResponse["threads"];
};

export function ForumTrendingSidebar({ threads }: ForumTrendingSidebarProps) {
  const trendingThreads = [...threads].sort((a, b) => b.views - a.views).slice(0, 5);

  /* Aggregate top contributors from thread data */
  const contributorMap = new Map<string, { userId: string; name: string; count: number }>();
  for (const thread of threads) {
    const existing = contributorMap.get(thread.userId);
    if (existing) {
      existing.count += 1;
    } else {
      contributorMap.set(thread.userId, {
        userId: thread.userId,
        name: thread.userName,
        count: 1,
      });
    }
  }
  const topContributors = [...contributorMap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="sticky top-6 space-y-6">
      {/* ── Trending Posts ── */}
      <div className="rounded-xl border border-border-default bg-bg-surface p-4">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-accent-primary" aria-hidden="true" />
          <h3 className="font-display text-sm font-bold tracking-tight text-text-primary">
            Trending
          </h3>
        </div>
        {trendingThreads.length === 0 ? (
          <p className="text-xs text-text-muted">No trending posts yet.</p>
        ) : (
          <ol className="space-y-2.5">
            {trendingThreads.map((thread, index) => (
              <li key={thread.id}>
                <Link
                  href={`/forum/${thread.id}`}
                  prefetch={false}
                  className="group flex items-start gap-2"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-bg-subtle text-[10px] font-bold text-text-muted">
                    {index + 1}
                  </span>
                  <span className="text-xs font-medium leading-snug text-text-secondary transition-colors group-hover:text-text-primary line-clamp-2">
                    {thread.title}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* ── Top Contributors ── */}
      <div className="rounded-xl border border-border-default bg-bg-surface p-4">
        <div className="mb-3 flex items-center gap-2">
          <Crown className="h-4 w-4 text-accent-warning" aria-hidden="true" />
          <h3 className="font-display text-sm font-bold tracking-tight text-text-primary">
            Top Contributors
          </h3>
        </div>
        {topContributors.length === 0 ? (
          <p className="text-xs text-text-muted">No contributors yet.</p>
        ) : (
          <ul className="space-y-2.5">
            {topContributors.map((contributor) => (
              <li key={contributor.userId} className="flex items-center gap-2.5">
                <Avatar name={contributor.name} size="xs" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-text-primary">
                    {contributor.name}
                  </p>
                  <p className="text-[10px] text-text-muted">
                    {contributor.count} {contributor.count === 1 ? "post" : "posts"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

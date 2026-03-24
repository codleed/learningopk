"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getForumThreads, type ForumFeedQuery, type ForumFeedResponse } from "@/lib/forum-api";

import { ForumThreadList } from "./forum-thread-list";

type FeedQuery = Omit<ForumFeedQuery, "limit" | "offset">;

type ForumThreadFeedProps = {
  initialThreads: ForumFeedResponse["threads"];
  query: FeedQuery;
  initialBatchSize: number;
  pageSize?: number;
};

export function ForumThreadFeed({ initialThreads, query, initialBatchSize, pageSize = 10 }: ForumThreadFeedProps) {
  const [threads, setThreads] = useState(initialThreads);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialThreads.length >= initialBatchSize);
  const [loadError, setLoadError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setThreads(initialThreads);
    setHasMore(initialThreads.length >= initialBatchSize);
    setIsLoading(false);
    setLoadError(null);
  }, [initialBatchSize, initialThreads]);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) {
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await getForumThreads({
        ...query,
        limit: pageSize,
        offset: threads.length
      });

      if (response.threads.length === 0) {
        setHasMore(false);
        return;
      }

      setThreads((currentThreads) => {
        const existingIds = new Set(currentThreads.map((thread) => thread.id));
        const dedupedNext = response.threads.filter((thread) => !existingIds.has(thread.id));
        return [...currentThreads, ...dedupedNext];
      });

      if (response.threads.length < pageSize) {
        setHasMore(false);
      }
    } catch {
      setLoadError("Unable to load more threads right now.");
    } finally {
      setIsLoading(false);
    }
  }, [hasMore, isLoading, pageSize, query, threads.length]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const isVisible = entries.some((entry) => entry.isIntersecting);
        if (isVisible) {
          void loadMore();
        }
      },
      {
        rootMargin: "480px 0px"
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return (
    <section className="space-y-4">
      <ForumThreadList threads={threads} />
      {threads.length > 0 && hasMore ? <div ref={sentinelRef} className="h-1 w-full" aria-hidden="true" /> : null}
      {isLoading ? <p className="text-sm text-muted-foreground">Loading more threads...</p> : null}
      {loadError ? <p className="text-sm text-rose-700">{loadError}</p> : null}
    </section>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

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
    <section className="space-y-3" aria-label="Forum threads">
      <ForumThreadList threads={threads} />

      {/* Infinite scroll sentinel */}
      {threads.length > 0 && hasMore ? (
        <div ref={sentinelRef} className="h-1 w-full" aria-hidden="true" />
      ) : null}

      {/* Loading indicator */}
      <AnimatePresence>
        {isLoading ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center justify-center gap-2 py-6"
          >
            <Loader2 className="h-4 w-4 animate-spin text-accent-primary" aria-hidden="true" />
            <span className="text-sm font-medium text-text-secondary">Loading more threads...</span>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Error state */}
      {loadError ? (
        <div className="rounded-lg border border-accent-danger/20 bg-accent-danger-light px-4 py-3">
          <p className="text-sm text-accent-danger">{loadError}</p>
        </div>
      ) : null}
    </section>
  );
}

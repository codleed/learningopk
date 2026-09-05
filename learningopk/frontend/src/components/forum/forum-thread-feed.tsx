"use client";

import { useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

import {
  forumKeys,
  getForumThreads,
  type ForumFeedFilters,
  type ForumFeedResponse,
} from "@/lib/forum-api";

import { ForumThreadList } from "./forum-thread-list";

type ForumThreadFeedProps = {
  initialThreads: ForumFeedResponse["threads"];
  query: ForumFeedFilters;
  initialBatchSize: number;
  pageSize?: number;
};

export function ForumThreadFeed({
  initialThreads,
  query,
  initialBatchSize,
  pageSize = 10,
}: ForumThreadFeedProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const feedQuery = useInfiniteQuery({
    queryKey: forumKeys.threads(query),
    queryFn: ({ pageParam }) => getForumThreads({ ...query, limit: pageSize, offset: pageParam }),
    initialPageParam: 0,
    // First page is server-rendered with `initialBatchSize` items; keep loading
    // more only while full pages come back (mirrors the original hasMore logic).
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.threads.length === 0) {
        return undefined;
      }
      const threshold = allPages.length === 1 ? initialBatchSize : pageSize;
      if (lastPage.threads.length < threshold) {
        return undefined;
      }
      return allPages.reduce((total, page) => total + page.threads.length, 0);
    },
    // Hydrate with the server-rendered first paint so there is no client refetch
    // on mount for the current filters.
    initialData: { pages: [{ threads: initialThreads }], pageParams: [0] },
    select: (data) => {
      // Dedupe by id across pages, matching the original append logic.
      const seen = new Set<string>();
      const threads = data.pages
        .flatMap((page) => page.threads)
        .filter((thread) => {
          if (seen.has(thread.id)) {
            return false;
          }
          seen.add(thread.id);
          return true;
        });
      return { ...data, pages: [{ threads }] };
    },
  });

  const threads = feedQuery.data.pages[0].threads;
  const { hasNextPage, isFetchingNextPage, fetchNextPage, isFetchNextPageError } = feedQuery;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage || isFetchingNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const isVisible = entries.some((entry) => entry.isIntersecting);
        if (isVisible) {
          void fetchNextPage();
        }
      },
      {
        rootMargin: "480px 0px",
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <section className="space-y-3" aria-label="Forum threads">
      <ForumThreadList threads={threads} />

      {/* Infinite scroll sentinel */}
      {threads.length > 0 && hasNextPage ? (
        <div ref={sentinelRef} className="h-1 w-full" aria-hidden="true" />
      ) : null}

      {/* Loading indicator */}
      <AnimatePresence>
        {isFetchingNextPage ? (
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
      {isFetchNextPageError ? (
        <div className="rounded-lg border border-accent-danger/20 bg-accent-danger-light px-4 py-3">
          <p className="text-sm text-accent-danger">Unable to load more threads right now.</p>
        </div>
      ) : null}
    </section>
  );
}

"use client";

import { useState } from "react";

import { SectionCard } from "@/components/foundation/section-card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { getAdminCommunityThreads, type AdminCommunityThread } from "@/lib/admin-api";

import { CommunityThreadHealthTable } from "./community-thread-health-table";

type SolvedFilter = "all" | "solved" | "unsolved";
type PinnedFilter = "all" | "pinned" | "unpinned";
type FlagStateFilter = "all" | "openFlags" | "noOpenFlags";

type AdminCommunityPanelProps = {
  initialEntries: AdminCommunityThread[];
  initialTotal: number;
};

const communityPageSize = 20;

export function AdminCommunityPanel({ initialEntries, initialTotal }: AdminCommunityPanelProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [solved, setSolved] = useState<SolvedFilter>("all");
  const [pinned, setPinned] = useState<PinnedFilter>("all");
  const [flagState, setFlagState] = useState<FlagStateFilter>("all");
  const [isApplying, setIsApplying] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const { pushToast } = useToast();
  const hasMore = entries.length < total;

  const runFetch = async ({ nextPage, append }: { nextPage: number; append: boolean }) => {
    try {
      const payload = await getAdminCommunityThreads({
        page: nextPage,
        pageSize: communityPageSize,
        solved,
        pinned,
        flagState,
      });

      setEntries((previous) => (append ? [...previous, ...payload.entries] : payload.entries));
      setTotal(payload.total);
      setPage(payload.page);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load community threads.";
      pushToast({
        tone: "error",
        title: "Community data unavailable",
        description: message,
      });
    }
  };

  const applyFilters = async () => {
    setIsApplying(true);
    try {
      await runFetch({
        nextPage: 1,
        append: false,
      });
    } finally {
      setIsApplying(false);
    }
  };

  const loadMore = async () => {
    if (isLoadingMore || !hasMore) {
      return;
    }

    setIsLoadingMore(true);
    try {
      await runFetch({
        nextPage: page + 1,
        append: true,
      });
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <SectionCard
      title="Community Thread Health"
      description="Review community thread volume, engagement, and open moderation pressure."
      actions={
        hasMore ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => void loadMore()}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? "Loading..." : "Load more"}
          </Button>
        ) : null
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4 md:items-end">
          <div className="space-y-1.5">
            <label
              htmlFor="community-solved"
              className="text-xs font-semibold uppercase tracking-wide text-foreground"
            >
              Solved state
            </label>
            <Select
              id="community-solved"
              value={solved}
              onChange={(event) => setSolved(event.target.value as SolvedFilter)}
              disabled={isApplying}
            >
              <option value="all">All</option>
              <option value="solved">Solved</option>
              <option value="unsolved">Unsolved</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="community-pinned"
              className="text-xs font-semibold uppercase tracking-wide text-foreground"
            >
              Pinned state
            </label>
            <Select
              id="community-pinned"
              value={pinned}
              onChange={(event) => setPinned(event.target.value as PinnedFilter)}
              disabled={isApplying}
            >
              <option value="all">All</option>
              <option value="pinned">Pinned</option>
              <option value="unpinned">Unpinned</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="community-flag-state"
              className="text-xs font-semibold uppercase tracking-wide text-foreground"
            >
              Moderation state
            </label>
            <Select
              id="community-flag-state"
              value={flagState}
              onChange={(event) => setFlagState(event.target.value as FlagStateFilter)}
              disabled={isApplying}
            >
              <option value="all">All</option>
              <option value="openFlags">Open flags</option>
              <option value="noOpenFlags">No open flags</option>
            </Select>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void applyFilters()}
            disabled={isApplying}
          >
            {isApplying ? "Applying..." : "Apply filters"}
          </Button>
        </div>

        <CommunityThreadHealthTable rows={entries} />
      </div>
    </SectionCard>
  );
}

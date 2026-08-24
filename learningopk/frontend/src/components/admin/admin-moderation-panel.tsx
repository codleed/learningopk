"use client";

import { useState } from "react";

import { SectionCard } from "@/components/foundation/section-card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { getAdminModerationFlags, type AdminModerationFlag } from "@/lib/admin-api";

import { ModerationQueueTable } from "./moderation-queue-table";

type ModerationStatusFilter = "open" | "resolved";
type ModerationTargetTypeFilter = "" | "thread" | "reply" | "chapter";

type AdminModerationPanelProps = {
  initialEntries: AdminModerationFlag[];
  initialTotal: number;
};

const moderationPageSize = 10;

export function AdminModerationPanel({ initialEntries, initialTotal }: AdminModerationPanelProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ModerationStatusFilter>("open");
  const [targetType, setTargetType] = useState<ModerationTargetTypeFilter>("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const { pushToast } = useToast();

  const loadFlags = async ({
    nextPage,
    nextStatus,
    nextTargetType,
    append,
  }: {
    nextPage: number;
    nextStatus: ModerationStatusFilter;
    nextTargetType: ModerationTargetTypeFilter;
    append: boolean;
  }) => {
    try {
      const payload = await getAdminModerationFlags({
        page: nextPage,
        pageSize: moderationPageSize,
        status: nextStatus,
        ...(nextTargetType ? { targetType: nextTargetType } : {}),
      });

      setEntries((previous) => (append ? [...previous, ...payload.entries] : payload.entries));
      setTotal(payload.total);
      setPage(payload.page);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to refresh moderation queue.";
      pushToast({
        tone: "error",
        title: "Moderation queue unavailable",
        description: message,
      });
    }
  };

  const refreshWithFilters = async (
    nextStatus: ModerationStatusFilter,
    nextTargetType: ModerationTargetTypeFilter
  ) => {
    setIsRefreshing(true);
    try {
      await loadFlags({
        nextPage: 1,
        nextStatus,
        nextTargetType,
        append: false,
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const loadMore = async () => {
    if (isLoadingMore || entries.length >= total) {
      return;
    }

    setIsLoadingMore(true);
    try {
      await loadFlags({
        nextPage: page + 1,
        nextStatus: status,
        nextTargetType: targetType,
        append: true,
      });
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <SectionCard
      title="Moderation Queue"
      description="Review and resolve reports by status and target type."
      actions={
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => void refreshWithFilters(status, targetType)}
            disabled={isRefreshing}
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
          {entries.length < total ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => void loadMore()}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? "Loading..." : "Load more"}
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="moderation-status"
              className="text-xs font-semibold uppercase tracking-wide text-foreground"
            >
              Status
            </label>
            <Select
              id="moderation-status"
              value={status}
              disabled={isRefreshing}
              onChange={(event) => {
                const nextStatus = event.target.value as ModerationStatusFilter;
                setStatus(nextStatus);
                void refreshWithFilters(nextStatus, targetType);
              }}
            >
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="moderation-target-type"
              className="text-xs font-semibold uppercase tracking-wide text-foreground"
            >
              Target type
            </label>
            <Select
              id="moderation-target-type"
              value={targetType}
              disabled={isRefreshing}
              onChange={(event) => {
                const nextTargetType = event.target.value as ModerationTargetTypeFilter;
                setTargetType(nextTargetType);
                void refreshWithFilters(status, nextTargetType);
              }}
            >
              <option value="">All</option>
              <option value="thread">Thread</option>
              <option value="reply">Reply</option>
              <option value="chapter">Chapter</option>
            </Select>
          </div>
        </div>

        <ModerationQueueTable
          rows={entries}
          onResolved={(flag) => {
            setEntries((previous) => previous.filter((entry) => entry.id !== flag.id));
            if (status === "open") {
              setTotal((current) => Math.max(0, current - 1));
            }
          }}
        />
      </div>
    </SectionCard>
  );
}

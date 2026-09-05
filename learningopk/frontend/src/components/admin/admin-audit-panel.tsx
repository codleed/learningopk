"use client";

import { useState } from "react";

import { SectionCard } from "@/components/foundation/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { getAdminAuditLogs, type AdminAuditLogResponseEntry } from "@/lib/admin-api";

import { AdminAuditTable } from "./admin-audit-table";

type AuditScopeFilter =
  "all" | "content" | "forum" | "moderation" | "notifications" | "settings" | "users";
type AuditStatusFilter = "all" | "success" | "failed";

type AdminAuditPanelProps = {
  initialEntries: AdminAuditLogResponseEntry[];
  initialTotal: number;
};

const auditPageSize = 20;

export function AdminAuditPanel({ initialEntries, initialTotal }: AdminAuditPanelProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [scope, setScope] = useState<AuditScopeFilter>("all");
  const [status, setStatus] = useState<AuditStatusFilter>("all");
  const [query, setQuery] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const { pushToast } = useToast();
  const hasMore = entries.length < total;

  const runFetch = async ({ nextPage, append }: { nextPage: number; append: boolean }) => {
    try {
      const payload = await getAdminAuditLogs({
        scope,
        status,
        q: query,
        page: nextPage,
        pageSize: auditPageSize,
      });

      setEntries((previous) => (append ? [...previous, ...payload.entries] : payload.entries));
      setTotal(payload.total);
      setPage(payload.page);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load audit logs.";
      pushToast({
        tone: "error",
        title: "Audit logs unavailable",
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

  const refresh = async () => {
    setIsRefreshing(true);
    try {
      await runFetch({
        nextPage: 1,
        append: false,
      });
    } finally {
      setIsRefreshing(false);
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
      title="Audit Activity"
      description="Review admin actions across scopes and investigate status outcomes."
      actions={
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => void refresh()}
            disabled={isRefreshing}
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
          {hasMore ? (
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
        <div className="grid gap-3 md:grid-cols-[220px_220px_1fr_auto] md:items-end">
          <div className="space-y-1.5">
            <label
              htmlFor="audit-scope"
              className="text-xs font-semibold uppercase tracking-wide text-foreground"
            >
              Scope
            </label>
            <Select
              id="audit-scope"
              value={scope}
              onChange={(event) => setScope(event.target.value as AuditScopeFilter)}
              disabled={isApplying}
            >
              <option value="all">All scopes</option>
              <option value="content">Content</option>
              <option value="forum">Forum</option>
              <option value="moderation">Moderation</option>
              <option value="users">Users</option>
              <option value="notifications">Notifications</option>
              <option value="settings">Settings</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="audit-status"
              className="text-xs font-semibold uppercase tracking-wide text-foreground"
            >
              Status
            </label>
            <Select
              id="audit-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as AuditStatusFilter)}
              disabled={isApplying}
            >
              <option value="all">All statuses</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="audit-search"
              className="text-xs font-semibold uppercase tracking-wide text-foreground"
            >
              Search logs
            </label>
            <Input
              id="audit-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Action, target, message, actor"
              disabled={isApplying}
            />
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

        <AdminAuditTable rows={entries} />
      </div>
    </SectionCard>
  );
}

"use client";

import { useState } from "react";

import { SectionCard } from "@/components/foundation/section-card";
import { Button } from "@/components/ui/button";
import { getAdminForumAuditLogs, type AdminAuditLogResponseEntry } from "@/lib/admin-api";

import { AdminAuditLogList, type AdminAuditLogEntry } from "./admin-audit-log-list";
import { ForumModerationTable, type ForumModerationRow } from "./forum-moderation-table";

type AdminForumPanelProps = {
  threads: ForumModerationRow[];
  initialAuditEntries: AdminAuditLogResponseEntry[];
  initialAuditTotal: number;
};

const auditPageSize = 10;

export function AdminForumPanel({ threads, initialAuditEntries, initialAuditTotal }: AdminForumPanelProps) {
  const [auditEntries, setAuditEntries] = useState<AdminAuditLogEntry[]>(initialAuditEntries);
  const [auditTotal, setAuditTotal] = useState(initialAuditTotal);
  const [auditPage, setAuditPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const refreshAuditLog = async () => {
    setIsRefreshing(true);
    try {
      const payload = await getAdminForumAuditLogs({
        page: 1,
        pageSize: auditPageSize
      });

      setAuditEntries(payload.entries);
      setAuditTotal(payload.total);
      setAuditPage(payload.page);
    } catch {
      // Keep current audit list on transient fetch failures.
    } finally {
      setIsRefreshing(false);
    }
  };

  const loadMoreAuditLog = async () => {
    if (isLoadingMore || auditEntries.length >= auditTotal) {
      return;
    }

    setIsLoadingMore(true);
    try {
      const nextPage = auditPage + 1;
      const payload = await getAdminForumAuditLogs({
        page: nextPage,
        pageSize: auditPageSize
      });

      setAuditEntries((previous) => [...previous, ...payload.entries]);
      setAuditTotal(payload.total);
      setAuditPage(payload.page);
    } catch {
      // Keep current audit list on transient fetch failures.
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <div className="space-y-5">
      <SectionCard
        title="Forum Moderation Queue"
        description="Pin or unpin important threads. Each attempt is persisted in admin audit logs."
      >
        <ForumModerationTable rows={threads} onMutationComplete={refreshAuditLog} />
      </SectionCard>

      <SectionCard
        title="Audit Log"
        actions={
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={refreshAuditLog} disabled={isRefreshing}>
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
            {auditEntries.length < auditTotal ? (
              <Button type="button" size="sm" variant="secondary" onClick={loadMoreAuditLog} disabled={isLoadingMore}>
                {isLoadingMore ? "Loading..." : "Load more"}
              </Button>
            ) : null}
          </div>
        }
      >
        <AdminAuditLogList entries={auditEntries} />
      </SectionCard>
    </div>
  );
}

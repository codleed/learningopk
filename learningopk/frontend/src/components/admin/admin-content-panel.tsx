"use client";

import { useState } from "react";

import { SectionCard } from "@/components/foundation/section-card";
import { Button } from "@/components/ui/button";
import {
  getAdminContentAuditLogs,
  type AdminAuditLogResponseEntry,
  type AdminCurriculumBoard,
} from "@/lib/admin-api";

import { AdminAuditLogList, type AdminAuditLogEntry } from "./admin-audit-log-list";
import { AdminCurriculumBuilder } from "./admin-curriculum-builder";
import { ChapterPublishTable, type ChapterPublishRow } from "./chapter-publish-table";

type AdminContentPanelProps = {
  chapters: ChapterPublishRow[];
  curriculumBoards: AdminCurriculumBoard[];
  initialAuditEntries: AdminAuditLogResponseEntry[];
  initialAuditTotal: number;
};

const auditPageSize = 10;

export function AdminContentPanel({
  chapters,
  curriculumBoards,
  initialAuditEntries,
  initialAuditTotal,
}: AdminContentPanelProps) {
  const [auditEntries, setAuditEntries] = useState<AdminAuditLogEntry[]>(initialAuditEntries);
  const [auditTotal, setAuditTotal] = useState(initialAuditTotal);
  const [auditPage, setAuditPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const refreshAuditLog = async () => {
    setIsRefreshing(true);
    try {
      const payload = await getAdminContentAuditLogs({
        page: 1,
        pageSize: auditPageSize,
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
      const payload = await getAdminContentAuditLogs({
        page: nextPage,
        pageSize: auditPageSize,
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
      {/*
       * @deprecated AdminCurriculumBuilder is deprecated and should be migrated to the new
       * dedicated pages (boards, classes, subjects, chapters). This component still exists
       * for backward compatibility as it contains exercise management functionality that
       * hasn't been migrated yet.
       */}
      <SectionCard
        title="Curriculum Builder"
        description="Create board, class, subject, and chapter hierarchy in one flow."
      >
        <AdminCurriculumBuilder initialBoards={curriculumBoards} />
      </SectionCard>
      <SectionCard
        title="Chapter Publish Controls"
        description="Use publish/unpublish actions to control chapter visibility. Failed actions are logged."
      >
        <ChapterPublishTable rows={chapters} onMutationComplete={refreshAuditLog} />
      </SectionCard>
      <SectionCard
        title="Audit Log"
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={refreshAuditLog}
              disabled={isRefreshing}
            >
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
            {auditEntries.length < auditTotal ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={loadMoreAuditLog}
                disabled={isLoadingMore}
              >
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

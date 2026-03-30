"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { BookOpen, GraduationCap, Book, FileText, Plus, Clock } from "lucide-react";

import {
  AdminPageHeader,
  AdminStatsStrip,
  AdminEntityTree,
  AdminQuickActions,
  AdminEntityDetailPanel,
} from "@/components/admin";
import {
  deleteAdminCurriculumBoard,
  deleteAdminCurriculumClass,
  deleteAdminCurriculumSubject,
  deleteAdminCurriculumChapter,
} from "@/lib/admin-api";
import type { AdminCurriculumBoard, AdminAuditLogResponseEntry } from "@/lib/admin-api";

type EntityType = "board" | "class" | "subject" | "chapter";

type SelectedEntity = {
  id: number;
  type: EntityType;
  name: string;
  childCount?: number;
  children?: Array<{
    id: number;
    type: "class" | "subject" | "chapter";
    name: string;
    subtitle?: string;
  }>;
};

type ContentDashboardProps = {
  boards: AdminCurriculumBoard[];
  auditLogs: AdminAuditLogResponseEntry[];
};

export function ContentDashboard({ boards, auditLogs }: ContentDashboardProps) {
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity | null>(null);

  // Compute stats from curriculum tree
  const boardCount = boards.length;
  const classCount = boards.reduce((sum, board) => sum + board.classes.length, 0);
  const subjectCount = boards.reduce(
    (sum, board) => sum + board.classes.reduce((cs, c) => cs + c.subjects.length, 0),
    0
  );
  const chapterCount = boards.reduce(
    (sum, board) =>
      sum +
      board.classes.reduce(
        (cs, c) => cs + c.subjects.reduce((ss, s) => ss + s.chapters.length, 0),
        0
      ),
    0
  );

  const quickActions = [
    {
      label: "Add Board",
      description: "Create a new board to organize content",
      href: "/admin/boards/add",
      icon: <BookOpen className="h-5 w-5" />,
    },
    {
      label: "Add Class",
      description: "Add a class level within a board",
      href: "/admin/classes/add",
      icon: <GraduationCap className="h-5 w-5" />,
    },
    {
      label: "Add Subject",
      description: "Create a subject within a class",
      href: "/admin/subjects/add",
      icon: <Book className="h-5 w-5" />,
    },
    {
      label: "Add Chapter",
      description: "Add chapters to a subject",
      href: "/admin/chapters/add",
      icon: <FileText className="h-5 w-5" />,
    },
  ];

  // Compute the full entity data with children
  const handleSelect = (entity: { id: number; type: EntityType; name: string }) => {
    const { id, type } = entity;

    // Find the entity path and children
    let children: SelectedEntity["children"] = undefined;
    let childCount = 0;

    for (const board of boards) {
      if (type === "board" && board.id === id) {
        children = board.classes.map((c) => ({
          id: c.id,
          type: "class" as const,
          name: c.name,
        }));
        childCount = board.classes.length;
        break;
      }

      for (const boardClass of board.classes) {
        if (type === "class" && boardClass.id === id) {
          children = boardClass.subjects.map((s) => ({
            id: s.id,
            type: "subject" as const,
            name: s.name,
          }));
          childCount = boardClass.subjects.length;
          break;
        }

        for (const subject of boardClass.subjects) {
          if (type === "subject" && subject.id === id) {
            children = subject.chapters.map((ch) => ({
              id: ch.id,
              type: "chapter" as const,
              name: `Chapter ${ch.chapterNumber}: ${ch.title}`,
              subtitle: ch.isPublished ? "Published" : "Draft",
            }));
            childCount = subject.chapters.length;
            break;
          }

          for (const chapter of subject.chapters) {
            if (type === "chapter" && chapter.id === id) {
              childCount = 0;
              children = undefined;
              break;
            }
          }
        }
      }
    }

    setSelectedEntity({
      id,
      type: entity.type,
      name: entity.name,
      childCount,
      children,
    });
  };

  const handleDelete = async (entity: { id: number; type: string; name: string }) => {
    if (!window.confirm(`Are you sure you want to delete "${entity.name}"?`)) {
      return;
    }

    try {
      switch (entity.type) {
        case "board":
          await deleteAdminCurriculumBoard(entity.id);
          break;
        case "class":
          await deleteAdminCurriculumClass(entity.id);
          break;
        case "subject":
          await deleteAdminCurriculumSubject(entity.id);
          break;
        case "chapter":
          await deleteAdminCurriculumChapter(entity.id);
          break;
      }
      handleRefresh();
    } catch (error) {
      window.alert(`Failed to delete ${entity.type}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleRefresh = () => {
    // TODO: Implement actual refresh via router refresh or API call
    console.log("Refresh requested");
  };

  const stats = [
    { label: "Boards", value: boardCount, icon: <BookOpen className="h-5 w-5" /> },
    { label: "Classes", value: classCount, icon: <GraduationCap className="h-5 w-5" /> },
    { label: "Subjects", value: subjectCount, icon: <Book className="h-5 w-5" /> },
    { label: "Chapters", value: chapterCount, icon: <FileText className="h-5 w-5" /> },
  ];

  // Compute breadcrumb for the detail panel
  const detailBreadcrumb = useMemo(() => {
    if (!selectedEntity) return [{ label: "Content" }];

    const segments = [{ label: "Content" }];

    for (const board of boards) {
      if (selectedEntity.type === "board" && board.id === selectedEntity.id) {
        segments.push({ label: board.name });
        break;
      }

      for (const boardClass of board.classes) {
        if (selectedEntity.type === "class" && boardClass.id === selectedEntity.id) {
          segments.push({ label: board.name });
          segments.push({ label: boardClass.name });
          break;
        }

        for (const subject of boardClass.subjects) {
          if (selectedEntity.type === "subject" && subject.id === selectedEntity.id) {
            segments.push({ label: board.name });
            segments.push({ label: boardClass.name });
            segments.push({ label: subject.name });
            break;
          }

          for (const chapter of subject.chapters) {
            if (selectedEntity.type === "chapter" && chapter.id === selectedEntity.id) {
              segments.push({ label: board.name });
              segments.push({ label: boardClass.name });
              segments.push({ label: subject.name });
              segments.push({ label: chapter.title });
              break;
            }
          }
          if (segments.length > 3) break;
        }
        if (segments.length > 2) break;
      }
      if (segments.length > 1) break;
    }

    return segments;
  }, [selectedEntity, boards]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Content Management"
        subtitle="Manage boards, classes, subjects, and chapters"
      />

      <AdminStatsStrip stats={stats} />

      {boards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border)] bg-[var(--card)] p-12 text-center">
          <BookOpen className="mb-4 h-12 w-12 text-[var(--muted-foreground)]" />
          <h3 className="mb-2 font-heading text-lg font-semibold text-[var(--foreground)]">
            No content yet
          </h3>
          <p className="mb-6 text-sm text-[var(--muted-foreground)]">
            Start by adding a board.
          </p>
          <Link
            href="/admin/boards/add"
            className="inline-flex items-center gap-2 rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--primary-light)]"
          >
            <Plus className="h-4 w-4" />
            Add Your First Board
          </Link>
        </div>
      ) : (
        <div
          className="grid gap-[var(--space-6)]"
          style={{
            gridTemplateColumns: "300px 1fr",
          }}
        >
          {/* Left sidebar - Entity Tree */}
          <div
            className="overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--card)]"
            style={{ maxHeight: "calc(100vh - 320px)" }}
          >
            <AdminEntityTree boards={boards} onSelect={handleSelect} />
          </div>

          {/* Right content area */}
          <div className="space-y-[var(--space-6)]">
            {/* Quick Actions */}
            <section>
              <h2 className="mb-4 font-heading text-lg font-semibold text-[var(--foreground)]">
                Quick Actions
              </h2>
              <AdminQuickActions actions={quickActions} />
            </section>

            {/* Entity Detail Panel */}
            <AdminEntityDetailPanel
              entity={selectedEntity}
              breadcrumbSegments={detailBreadcrumb}
              onDelete={handleDelete}
              onRefresh={handleRefresh}
            />

            {/* Recent Audit Log */}
            <section>
              <div className="mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-[var(--muted-foreground)]" />
                <h2 className="font-heading text-lg font-semibold text-[var(--foreground)]">
                  Recent Activity
                </h2>
              </div>
              {auditLogs.length === 0 ? (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 text-center text-sm text-[var(--muted-foreground)]">
                  No recent activity
                </div>
              ) : (
                <div className="space-y-3">
                  {auditLogs.slice(0, 5).map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start justify-between rounded-lg border border-[var(--border)] bg-[var(--card)] p-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[var(--foreground)] truncate">
                          {entry.action}
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)] truncate">
                          {entry.target}
                        </p>
                      </div>
                      <div className="ml-4 flex shrink-0 flex-col items-end gap-1">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            entry.status === "success"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {entry.status}
                        </span>
                        <span className="text-xs text-[var(--muted-foreground)]">
                          {entry.actor.name}
                        </span>
                        <span className="text-xs text-[var(--muted-foreground)]">
                          {new Date(entry.occurredAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

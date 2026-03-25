"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, GraduationCap, Book, FileText, Plus, Clock } from "lucide-react";

import {
  AdminBreadcrumb,
  AdminPageHeader,
  AdminStatsStrip,
  AdminEntityTree,
  AdminQuickActions
} from "@/components/admin";
import type { AdminCurriculumBoard, AdminAuditLogResponseEntry } from "@/lib/admin-api";

type SelectedEntity = {
  id: number;
  type: "board" | "class" | "subject" | "chapter";
  name: string;
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
      icon: <BookOpen className="h-5 w-5" />
    },
    {
      label: "Add Class",
      description: "Add a class level within a board",
      href: "/admin/classes/add",
      icon: <GraduationCap className="h-5 w-5" />
    },
    {
      label: "Add Subject",
      description: "Create a subject within a class",
      href: "/admin/subjects/add",
      icon: <Book className="h-5 w-5" />
    },
    {
      label: "Add Chapter",
      description: "Add chapters to a subject",
      href: "/admin/chapters/add",
      icon: <FileText className="h-5 w-5" />
    }
  ];

  const handleSelect = (entity: { id: number; type: "board" | "class" | "subject" | "chapter"; name: string }) => {
    setSelectedEntity(entity);
  };

  const stats = [
    { label: "Boards", value: boardCount, icon: <BookOpen className="h-5 w-5" /> },
    { label: "Classes", value: classCount, icon: <GraduationCap className="h-5 w-5" /> },
    { label: "Subjects", value: subjectCount, icon: <Book className="h-5 w-5" /> },
    { label: "Chapters", value: chapterCount, icon: <FileText className="h-5 w-5" /> }
  ];

  return (
    <div className="space-y-6">
      <AdminBreadcrumb segments={[{ label: "Admin", href: "/admin" }, { label: "Content" }]} />

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
            gridTemplateColumns: "300px 1fr"
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

            {/* Selected Entity Display */}
            {selectedEntity && (
              <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-[var(--space-6)]">
                <h3 className="mb-2 font-heading text-sm font-semibold uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
                  Selected
                </h3>
                <p className="text-[var(--foreground)]">
                  {selectedEntity.type.charAt(0).toUpperCase() + selectedEntity.type.slice(1)}:{" "}
                  <span className="font-medium">{selectedEntity.name}</span>
                </p>
              </section>
            )}

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

"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, GraduationCap, Book, FileText, Brain, ClipboardList, Layers, Plus, Clock } from "lucide-react";

import {
  AdminPageHeader,
  AdminBreadcrumb,
} from "@/components/admin";
import { ContentTabs } from "@/components/admin/content-tabs";
import { ContentStatsStrip } from "@/components/admin/content-stats-strip";
import { ContentListTable, type ColumnDef } from "@/components/admin/content-list-table";
import type { AdminCurriculumBoard, AdminAuditLogResponseEntry } from "@/lib/admin-api";

type ContentDashboardProps = {
  boards: AdminCurriculumBoard[];
  auditLogs: AdminAuditLogResponseEntry[];
  stats: {
    boards: number;
    classes: number;
    subjects: number;
    chapters: number;
    exercises: number;
    quizzes: number;
    flashcardDecks: number;
  };
};

export function ContentDashboard({ boards, auditLogs, stats }: ContentDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("boards");

  // Quick actions per tab
  const quickActions = [
    { label: "Add Board", href: "/admin/content/boards/add", icon: <BookOpen className="h-5 w-5" /> },
    { label: "Add Class", href: "/admin/content/classes/add", icon: <GraduationCap className="h-5 w-5" /> },
    { label: "Add Subject", href: "/admin/content/subjects/add", icon: <Book className="h-5 w-5" /> },
    { label: "Add Chapter", href: "/admin/content/chapters/add", icon: <FileText className="h-5 w-5" /> },
    { label: "Add Exercise", href: "/admin/content/exercises/add", icon: <Brain className="h-5 w-5" /> },
    { label: "Add Quiz", href: "/admin/content/quizzes/add", icon: <ClipboardList className="h-5 w-5" /> },
    { label: "Add Flash Cards", href: "/admin/content/flashcards/add", icon: <Layers className="h-5 w-5" /> },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Content Management"
        subtitle="Manage boards, classes, subjects, chapters, exercises, quizzes, and flash cards"
      />

      <ContentStatsStrip stats={stats} />

      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)]">
        <ContentTabs />
        
        <div className="p-6">
          {/* Tab Content Area - This would be replaced by actual tab content */}
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="mb-4 h-12 w-12 text-[var(--muted-foreground)]" />
            <h3 className="mb-2 font-heading text-lg font-semibold text-[var(--foreground)]">
              Select a content type tab
            </h3>
            <p className="mb-6 max-w-md text-sm text-[var(--muted-foreground)]">
              Choose a tab above to view and manage that content type. Each tab shows a list of items with Edit actions immediately visible.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
                >
                  {action.icon}
                  {action.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
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
                  <p className="truncate text-sm font-medium text-[var(--foreground)]">
                    {entry.action}
                  </p>
                  <p className="truncate text-xs text-[var(--muted-foreground)]">
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
  );
}

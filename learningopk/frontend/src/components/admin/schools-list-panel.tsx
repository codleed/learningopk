"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Check, GraduationCap, Trash2 } from "lucide-react";

import { ContentListTable } from "@/components/admin/content-list-table";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { SchoolListItem } from "@/lib/school-api";
import { deleteSchool } from "@/lib/school-api";
import { useToast } from "@/components/ui/toast";

type SchoolsListPanelProps = {
  initialSchools: SchoolListItem[];
};

export function SchoolsListPanel({ initialSchools }: SchoolsListPanelProps) {
  const [schools, setSchools] = useState(initialSchools);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [schoolToDelete, setSchoolToDelete] = useState<SchoolListItem | null>(null);
  const { pushToast } = useToast();

  const handleCopyInviteCode = async (code: string, id: number) => {
    await navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteClick = (school: SchoolListItem) => {
    setSchoolToDelete(school);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!schoolToDelete) return;
    setDeletingId(schoolToDelete.id);
    try {
      await deleteSchool(schoolToDelete.id);
      setSchools((prev) => prev.filter((s) => s.id !== schoolToDelete.id));
      pushToast({
        title: "School deleted",
        description: `"${schoolToDelete.name}" has been deleted.`,
        tone: "success",
      });
    } catch (error) {
      pushToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete school",
        tone: "error",
      });
    } finally {
      setDeletingId(null);
      setConfirmOpen(false);
      setSchoolToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setConfirmOpen(false);
    setSchoolToDelete(null);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Admin Schools"
        title="School Management"
        subtitle="Create and manage partner schools. Each school gets an invite code for students."
      />

      <ContentListTable
        title="Schools"
        items={schools}
        addHref="/admin/schools/add"
        addLabel="Add School"
        emptyMessage="No schools found. Create one to get started."
        getItemId={(s) => s.id}
        onDelete={(s) => handleDeleteClick(s)}
        columns={[
          {
            key: "name",
            header: "School",
            render: (s) => (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-subtle)]">
                  <GraduationCap className="h-4 w-4 text-[var(--text-secondary)]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{s.name}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{s.board}</p>
                </div>
              </div>
            ),
          },
          {
            key: "students",
            header: "Students",
            render: (s) => (
              <span className="text-sm text-[var(--text-primary)]">{s.studentCount}</span>
            ),
            className: "w-24",
          },
          {
            key: "invite",
            header: "Invite Code",
            render: (s) => (
              <div className="flex items-center gap-2">
                <code className="rounded bg-[var(--bg-subtle)] px-2 py-1 text-xs font-mono text-[var(--text-primary)]">
                  {s.inviteCode}
                </code>
                <button
                  onClick={() => handleCopyInviteCode(s.inviteCode, s.id)}
                  className="rounded-md p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-colors"
                >
                  {copiedId === s.id ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            ),
          },
          {
            key: "created",
            header: "Created",
            render: (s) => (
              <span className="text-sm text-[var(--text-secondary)]">
                {new Date(s.createdAt).toLocaleDateString()}
              </span>
            ),
            className: "w-32",
          },
        ]}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Delete School"
        description={
          schoolToDelete
            ? `Are you sure you want to delete "${schoolToDelete.name}"? This will unassign all students from this school. This action cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        isPending={deletingId !== null}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}

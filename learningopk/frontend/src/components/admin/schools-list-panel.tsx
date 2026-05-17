"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Check, GraduationCap } from "lucide-react";

import { ContentListTable } from "@/components/admin/content-list-table";
import { AdminPageHeader } from "@/components/admin/page-header";
import type { SchoolListItem } from "@/lib/school-api";

type SchoolsListPanelProps = {
  initialSchools: SchoolListItem[];
};

export function SchoolsListPanel({ initialSchools }: SchoolsListPanelProps) {
  const [schools] = useState(initialSchools);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const handleCopyInviteCode = async (code: string, id: number) => {
    await navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
    </div>
  );
}

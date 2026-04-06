"use client";

import { useState } from "react";

import { AdminPageHeader, ContentTabs, ContentStatsStrip, ContentListTable } from "@/components/admin";
import type { AdminCurriculumBoard } from "@/lib/admin-api";
import { deleteAdminCurriculumClass } from "@/lib/admin-api";

type ClassesPageClientProps = {
  initialBoards: AdminCurriculumBoard[];
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

type ClassRow = {
  id: number;
  name: string;
  boardId: number;
  boardName: string;
  subjectCount: number;
  chapterCount: number;
};

export function ClassesPageClient({ initialBoards, stats }: ClassesPageClientProps) {
  // Flatten classes with board context
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [classes] = useState<ClassRow[]>(
    initialBoards.flatMap((board) =>
      board.classes.map((cls) => ({
        id: cls.id,
        name: cls.name,
        boardId: board.id,
        boardName: board.name,
        subjectCount: cls.subjects.length,
        chapterCount: cls.subjects.reduce((sum, s) => sum + s.chapters.length, 0),
      }))
    )
  );

  const handleDelete = async (cls: ClassRow) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${cls.name}"? This will also delete all subjects and chapters under it. This action cannot be undone.`
      )
    ) {
      setDeletingId(cls.id);
      try {
        await deleteAdminCurriculumClass(cls.id);
        alert("Class deleted successfully.");
        window.location.reload();
      } catch {
        alert("Failed to delete class. Please try again.");
      } finally {
        setDeletingId(null);
      }
    }
  };

  const columns = [
    {
      key: "name",
      header: "Name",
      render: (cls: ClassRow) => (
        <span className="font-medium text-[var(--text-primary)]">{cls.name}</span>
      ),
    },
    {
      key: "boardName",
      header: "Board",
      render: (cls: ClassRow) => (
        <span className="text-[var(--text-secondary)]">{cls.boardName}</span>
      ),
    },
    {
      key: "subjectCount",
      header: "Subjects",
      render: (cls: ClassRow) => (
        <span className="text-[var(--text-primary)]">{cls.subjectCount}</span>
      ),
    },
    {
      key: "chapterCount",
      header: "Chapters",
      render: (cls: ClassRow) => (
        <span className="text-[var(--text-primary)]">{cls.chapterCount}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Content Management"
        subtitle="Manage boards, classes, subjects, chapters, exercises, quizzes, and flash cards"
      />

      <ContentStatsStrip stats={stats} />

      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)]">
        <ContentTabs />

        <div className="p-6">
          <ContentListTable
            title="Classes"
            items={classes}
            columns={columns}
            onEdit={(cls) => {
              window.location.href = `/admin/classes/${cls.id}/edit`;
            }}
            onDelete={handleDelete}
            addHref="/admin/classes/add"
            addLabel="+ Add Class"
            emptyMessage="No classes found. Create your first class to get started."
            getItemId={(cls) => cls.id}
          />
        </div>
      </div>
    </div>
  );
}
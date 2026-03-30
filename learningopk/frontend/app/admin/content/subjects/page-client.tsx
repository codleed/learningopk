"use client";

import { useState } from "react";

import { AdminPageHeader, ContentTabs, ContentStatsStrip, ContentListTable } from "@/components/admin";
import { deleteAdminCurriculumSubject } from "@/lib/admin-api";
import type { AdminCurriculumBoard } from "@/lib/admin-api";

type SubjectsPageClientProps = {
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

type SubjectRow = {
  id: number;
  name: string;
  boardId: number;
  boardName: string;
  classId: number;
  className: string;
  chapterCount: number;
};

export function SubjectsPageClient({ initialBoards, stats }: SubjectsPageClientProps) {
  // Flatten subjects with board/class context
  const [subjects] = useState<SubjectRow[]>(
    initialBoards.flatMap((board) =>
      board.classes.flatMap((cls) =>
        cls.subjects.map((subject) => ({
          id: subject.id,
          name: subject.name,
          boardId: board.id,
          boardName: board.name,
          classId: cls.id,
          className: cls.name,
          chapterCount: subject.chapters.length,
        }))
      )
    )
  );

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (subject: SubjectRow) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${subject.name}"? This will also delete all chapters under it. This action cannot be undone.`
      )
    ) {
      setIsDeleting(true);
      try {
        await deleteAdminCurriculumSubject(subject.id);
        alert("Subject deleted successfully.");
        window.location.reload();
      } catch (error) {
        alert("Failed to delete subject. Please try again.");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const columns = [
    {
      key: "name",
      header: "Name",
      render: (subject: SubjectRow) => (
        <span className="font-medium text-[var(--foreground)]">{subject.name}</span>
      ),
    },
    {
      key: "context",
      header: "Board / Class",
      render: (subject: SubjectRow) => (
        <span className="text-[var(--muted-foreground)]">
          {subject.boardName} / {subject.className}
        </span>
      ),
    },
    {
      key: "chapterCount",
      header: "Chapters",
      render: (subject: SubjectRow) => (
        <span className="text-[var(--foreground)]">{subject.chapterCount}</span>
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

      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)]">
        <ContentTabs />

        <div className="p-6">
          <ContentListTable
            title="Subjects"
            items={subjects}
            columns={columns}
            onEdit={(subject) => {
              window.location.href = `/admin/subjects/${subject.id}/edit`;
            }}
            onDelete={handleDelete}
            addHref="/admin/subjects/add"
            addLabel="+ Add Subject"
            emptyMessage="No subjects found. Create your first subject to get started."
            getItemId={(subject) => subject.id}
          />
        </div>
      </div>
    </div>
  );
}
"use client";

import { useMemo, useState } from "react";

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

const PAGE_SIZE = 25;

export function SubjectsPageClient({ initialBoards, stats }: SubjectsPageClientProps) {
  const [page, setPage] = useState(1);
  const [isDeleting, setIsDeleting] = useState(false);

  const allSubjects = useMemo<SubjectRow[]>(
    () =>
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
      ),
    [initialBoards]
  );

  const totalSubjects = allSubjects.length;
  const totalPages = Math.max(1, Math.ceil(totalSubjects / PAGE_SIZE));
  const clampedPage = Math.max(1, Math.min(page, totalPages));
  const pagedSubjects = useMemo(
    () => allSubjects.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE),
    [allSubjects, clampedPage]
  );

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

  const handlePageChange = (newPage: number) => {
    setPage(Math.max(1, Math.min(newPage, totalPages)));
  };

  const columns = [
    {
      key: "name",
      header: "Name",
      render: (subject: SubjectRow) => (
        <span className="font-medium text-[var(--text-primary)]">{subject.name}</span>
      ),
    },
    {
      key: "context",
      header: "Board / Class",
      render: (subject: SubjectRow) => (
        <span className="text-[var(--text-secondary)]">
          {subject.boardName} / {subject.className}
        </span>
      ),
    },
    {
      key: "chapterCount",
      header: "Chapters",
      render: (subject: SubjectRow) => (
        <span className="text-[var(--text-primary)]">{subject.chapterCount}</span>
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
            title="Subjects"
            items={pagedSubjects}
            columns={columns}
            onEdit={(subject) => {
              window.location.href = `/admin/subjects/${subject.id}/edit`;
            }}
            onDelete={handleDelete}
            addHref="/admin/subjects/add"
            addLabel="+ Add Subject"
            emptyMessage="No subjects found. Create your first subject to get started."
            getItemId={(subject) => subject.id}
            pagination={{
              page: clampedPage,
              pageSize: PAGE_SIZE,
              total: totalSubjects,
              onPageChange: handlePageChange,
            }}
          />
        </div>
      </div>
    </div>
  );
}
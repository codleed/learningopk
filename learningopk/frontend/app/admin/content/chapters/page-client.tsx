"use client";

import { useState } from "react";

import { AdminPageHeader, ContentTabs, ContentStatsStrip, ContentListTable } from "@/components/admin";
import type { AdminCurriculumBoard } from "@/lib/admin-api";
import { deleteAdminCurriculumChapter } from "@/lib/admin-api";

type ChaptersPageClientProps = {
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

type ChapterRow = {
  id: number;
  title: string;
  chapterNumber: number;
  slug: string;
  boardId: number;
  boardName: string;
  classId: number;
  className: string;
  subjectId: number;
  subjectName: string;
  isPublished: boolean;
};

export function ChaptersPageClient({ initialBoards, stats }: ChaptersPageClientProps) {
  // Flatten chapters with full context
  const [isDeleting, setIsDeleting] = useState(false);
  const [chapters] = useState<ChapterRow[]>(
    initialBoards.flatMap((board) =>
      board.classes.flatMap((cls) =>
        cls.subjects.flatMap((subject) =>
          subject.chapters.map((chapter) => ({
            id: chapter.id,
            title: chapter.title,
            chapterNumber: chapter.chapterNumber,
            slug: chapter.slug,
            boardId: board.id,
            boardName: board.name,
            classId: cls.id,
            className: cls.name,
            subjectId: subject.id,
            subjectName: subject.name,
            isPublished: chapter.isPublished,
          }))
        )
      )
    )
  );

  const handleDelete = async (chapter: ChapterRow) => {
    if (
      window.confirm(
        `Are you sure you want to delete "Chapter ${chapter.chapterNumber}: ${chapter.title}"? This action cannot be undone.`
      )
    ) {
      setIsDeleting(true);
      try {
        await deleteAdminCurriculumChapter(chapter.id);
        alert("Chapter deleted successfully.");
        window.location.reload();
      } catch {
        alert("Failed to delete chapter. Please try again.");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const columns = [
    {
      key: "chapter",
      header: "Chapter",
      render: (chapter: ChapterRow) => (
        <div>
          <p className="font-medium text-[var(--foreground)]">
            Chapter {chapter.chapterNumber}: {chapter.title}
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {chapter.boardName} / {chapter.className}
          </p>
        </div>
      ),
    },
    {
      key: "subject",
      header: "Subject",
      render: (chapter: ChapterRow) => (
        <span className="text-[var(--muted-foreground)]">{chapter.subjectName}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (chapter: ChapterRow) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            chapter.isPublished
              ? "bg-green-100 text-green-700"
              : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {chapter.isPublished ? "Published" : "Draft"}
        </span>
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
            title="Chapters"
            items={chapters}
            columns={columns}
            onEdit={(chapter) => {
              window.location.href = `/admin/chapters/${chapter.id}/edit`;
            }}
            onDelete={handleDelete}
            addHref="/admin/chapters/add"
            addLabel="+ Add Chapter"
            emptyMessage="No chapters found. Create your first chapter to get started."
            getItemId={(chapter) => chapter.id}
          />
        </div>
      </div>
    </div>
  );
}
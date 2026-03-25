"use client";

import { useState } from "react";

import { AdminPageHeader, ContentTabs, ContentStatsStrip, ContentListTable } from "@/components/admin";
import type { AdminCurriculumBoard } from "@/lib/admin-api";

type BoardsPageClientProps = {
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

type BoardRow = {
  id: number;
  name: string;
  classCount: number;
  subjectCount: number;
  chapterCount: number;
};

export function BoardsPageClient({ initialBoards, stats }: BoardsPageClientProps) {
  // Transform boards data for the table
  const [boards] = useState<BoardRow[]>(
    initialBoards.map((board) => ({
      id: board.id,
      name: board.name,
      classCount: board.classes.length,
      subjectCount: board.classes.reduce((sum, c) => sum + c.subjects.length, 0),
      chapterCount: board.classes.reduce(
        (sum, c) => sum + c.subjects.reduce((ss, s) => ss + s.chapters.length, 0),
        0
      ),
    }))
  );

  const handleDelete = async (board: BoardRow) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${board.name}"? This will also delete all classes, subjects, and chapters under it. This action cannot be undone.`
      )
    ) {
      // TODO: Call delete API
      console.log("Delete board:", board.id);
    }
  };

  const columns = [
    {
      key: "name",
      header: "Name",
      render: (board: BoardRow) => (
        <span className="font-medium text-[var(--foreground)]">{board.name}</span>
      ),
    },
    {
      key: "classCount",
      header: "Classes",
      render: (board: BoardRow) => (
        <span className="text-[var(--foreground)]">{board.classCount}</span>
      ),
    },
    {
      key: "subjectCount",
      header: "Subjects",
      render: (board: BoardRow) => (
        <span className="text-[var(--foreground)]">{board.subjectCount}</span>
      ),
    },
    {
      key: "chapterCount",
      header: "Chapters",
      render: (board: BoardRow) => (
        <span className="text-[var(--foreground)]">{board.chapterCount}</span>
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
            title="Boards"
            items={boards}
            columns={columns}
            onEdit={(board) => {
              window.location.href = `/admin/content/boards/${board.id}/edit`;
            }}
            onDelete={handleDelete}
            addHref="/admin/content/boards/add"
            addLabel="+ Add Board"
            emptyMessage="No boards found. Create your first board to get started."
            getItemId={(board) => board.id}
          />
        </div>
      </div>
    </div>
  );
}

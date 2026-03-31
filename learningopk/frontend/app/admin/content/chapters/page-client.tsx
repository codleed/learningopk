"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

import { AdminPageHeader, ContentTabs, ContentStatsStrip, ContentListTable } from "@/components/admin";
import { ChapterPublishToggle } from "@/components/admin/chapter-publish-toggle";
import { Button } from "@/components/ui/button";
import { getAdminCurriculumTree, type AdminCurriculumBoard } from "@/lib/admin-api";

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
  const router = useRouter();
  const [chapters, setChapters] = useState<ChapterRow[]>(
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
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const boards = await getAdminCurriculumTree();
      setChapters(
        boards.flatMap((board) =>
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
    } catch (error) {
      console.error("Failed to refresh chapters:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const handlePublishComplete = (chapterId: number, nextPublished: boolean) => {
    setChapters((prev) =>
      prev.map((ch) => (ch.id === chapterId ? { ...ch, isPublished: nextPublished } : ch))
    );
  };

  const handleDelete = async (chapter: ChapterRow) => {
    if (
      window.confirm(
        `Are you sure you want to delete "Chapter ${chapter.chapterNumber}: ${chapter.title}"? This action cannot be undone.`
      )
    ) {
      // TODO: Call delete API
      console.log("Delete chapter:", chapter.id);
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
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={refreshData}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        }
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
            renderCustomAction={(chapter) => (
              <ChapterPublishToggle
                chapterId={chapter.id}
                chapterLabel={`Chapter ${chapter.chapterNumber}: ${chapter.title}`}
                isPublished={chapter.isPublished}
                onComplete={(result) => {
                  handlePublishComplete(chapter.id, result.nextPublished);
                }}
              />
            )}
          />
        </div>
      </div>
    </div>
  );
}
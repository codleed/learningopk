"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

import { AdminPageHeader } from "@/components/admin";
import { ContentTabs } from "@/components/admin/content-tabs";
import { ContentStatsStrip } from "@/components/admin/content-stats-strip";
import { ContentListTable, type ColumnDef } from "@/components/admin/content-list-table";
import { deleteAdminPastPaper, type AdminCurriculumBoard, type PastPaperResponse } from "@/lib/admin-api";
import { useToast } from "@/components/ui/toast";

type PastPapersPageProps = {
  boards: AdminCurriculumBoard[];
  initialPastPapers: PastPaperResponse[];
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

export function PastPapersPage({ boards, initialPastPapers, stats }: PastPapersPageProps) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [filterBoardId, setFilterBoardId] = useState<string>("");
  const [filterGrade, setFilterGrade] = useState<string>("");
  const [filterSubjectId, setFilterSubjectId] = useState<string>("");

  // Build board options
  const boardOptions = useMemo(() => {
    return boards.map((board) => ({
      id: board.id,
      label: board.name
    }));
  }, [boards]);

  // Build subject options from boards tree
  const subjectOptions = useMemo(() => {
    const options: Array<{ id: number; label: string }> = [];
    for (const board of boards) {
      for (const boardClass of board.classes) {
        for (const subject of boardClass.subjects) {
          options.push({
            id: subject.id,
            label: `${board.name} / ${boardClass.name} / ${subject.name}`
          });
        }
      }
    }
    return options;
  }, [boards]);

  // Filter past papers
  const filteredPapers = useMemo(() => {
    let result = initialPastPapers;
    if (filterBoardId) {
      const boardId = parseInt(filterBoardId, 10);
      result = result.filter((p) => p.boardId === boardId);
    }
    if (filterGrade) {
      result = result.filter((p) => p.grade === filterGrade);
    }
    if (filterSubjectId) {
      const subjectId = parseInt(filterSubjectId, 10);
      result = result.filter((p) => p.subjectId === subjectId);
    }
    return result;
  }, [initialPastPapers, filterBoardId, filterGrade, filterSubjectId]);

  const columns: ColumnDef<PastPaperResponse>[] = [
    {
      key: "title",
      header: "Title",
      render: (p) => (
        <span className="font-medium text-[var(--text-primary)]">
          {p.title}
        </span>
      ),
    },
    {
      key: "year",
      header: "Year",
      render: (p) => (
        <span className="text-sm text-[var(--text-primary)]">
          {p.year}
        </span>
      ),
    },
    {
      key: "board-grade",
      header: "Board / Grade",
      render: (p) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-[var(--text-primary)]">
            {p.boardName ?? `Board #${p.boardId}`}
          </span>
          <span className="text-xs text-[var(--text-secondary)]">
            Class {p.grade}
          </span>
        </div>
      ),
    },
    {
      key: "subject",
      header: "Subject",
      render: (p) => (
        <span className="text-xs text-[var(--text-primary)]">
          {p.subjectName ?? `Subject #${p.subjectId}`}
        </span>
      ),
    },
    {
      key: "content",
      header: "Content",
      render: (p) => (
        <div className="flex flex-wrap gap-1">
          {p.paperContent && (
            <span className="inline-flex items-center rounded-full bg-[var(--bg-subtle)] px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
              Paper
            </span>
          )}
          {p.solutionContent && (
            <span className="inline-flex items-center rounded-full bg-[var(--bg-subtle)] px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
              Solution
            </span>
          )}
        </div>
      ),
    },
  ];

  const handleDelete = async (paper: PastPaperResponse) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${paper.title}"? This action cannot be undone.`
      )
    ) {
      try {
        await deleteAdminPastPaper(paper.id);
        pushToast({
          title: "Past paper deleted",
          description: `"${paper.title}" has been deleted successfully.`,
          tone: "success",
        });
        router.refresh();
      } catch (error) {
        pushToast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to delete past paper",
          tone: "error",
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Content Management"
        subtitle="Manage boards, classes, subjects, chapters, exercises, quizzes, flash cards, formulas, and past papers"
      />

      <ContentStatsStrip stats={stats} />

      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)]">
        <ContentTabs />

        <div className="p-6">
          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <label
              htmlFor="pp-board-filter"
              className="text-sm font-medium text-[var(--text-secondary)]"
            >
              Filter:
            </label>
            <select
              id="pp-board-filter"
              value={filterBoardId}
              onChange={(e) => setFilterBoardId(e.target.value)}
              className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            >
              <option value="">All boards</option>
              {boardOptions.map((opt) => (
                <option key={opt.id} value={opt.id.toString()}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              id="pp-grade-filter"
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
              className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            >
              <option value="">All grades</option>
              <option value="9">Class 9</option>
              <option value="10">Class 10</option>
            </select>
            <select
              id="pp-subject-filter"
              value={filterSubjectId}
              onChange={(e) => setFilterSubjectId(e.target.value)}
              className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            >
              <option value="">All subjects</option>
              {subjectOptions.map((opt) => (
                <option key={opt.id} value={opt.id.toString()}>
                  {opt.label}
                </option>
              ))}
            </select>
            {(filterBoardId || filterGrade || filterSubjectId) && (
              <span className="text-xs text-[var(--text-secondary)]">
                {filteredPapers.length} paper{filteredPapers.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          <ContentListTable
            title="Past Papers"
            items={filteredPapers}
            columns={columns}
            onDelete={handleDelete}
            editHref={(p) => `/admin/content/past-papers/${p.id}/edit`}
            addHref="/admin/content/past-papers/add"
            addLabel="Add Past Paper"
            emptyMessage="No past papers found. Create your first past paper to get started."
            getItemId={(p) => p.id}
          />
        </div>
      </div>
    </div>
  );
}

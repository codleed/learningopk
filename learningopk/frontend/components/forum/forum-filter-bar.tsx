import Link from "next/link";
import type { ReactNode } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { ForumFiltersResponse } from "@/lib/forum-api";

type ForumFilterBarProps = {
  filters: ForumFiltersResponse;
  topContent?: ReactNode;
  createThreadHref?: string;
  selected: {
    q?: string;
    board?: string;
    grade?: "9" | "10";
    subjectId?: number;
    chapterId?: number;
    solved: "all" | "solved" | "unsolved";
  };
};

export function ForumFilterBar({
  filters,
  topContent,
  createThreadHref,
  selected,
}: ForumFilterBarProps) {
  const filteredSubjects = filters.subjects.filter((subject) => {
    if (selected.board) {
      const board = filters.boards.find(
        (option) => option.id === subject.boardId,
      );
      if (!board || board.slug !== selected.board) {
        return false;
      }
    }

    if (selected.grade && subject.grade !== selected.grade) {
      return false;
    }

    return true;
  });

  const filteredChapters = filters.chapters.filter((chapter) => {
    if (!selected.subjectId) {
      return true;
    }

    return chapter.subjectId === selected.subjectId;
  });

  return (
    <section className="surface-card rounded-xl border border-border p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">
          Search and filter threads
        </h2>
      </div>
      {topContent ? <div className="mb-4">{topContent}</div> : null}
      <form method="GET" className="grid gap-3 md:grid-cols-6">
        <label className="space-y-1 text-sm text-foreground md:col-span-2">
          <span>Search</span>
          <Input
            name="q"
            defaultValue={selected.q ?? ""}
            placeholder="Search title and body"
          />
        </label>

        <label className="space-y-1 text-sm text-foreground">
          <span>Board</span>
          <Select name="board" defaultValue={selected.board ?? ""}>
            <option value="">All boards</option>
            {filters.boards.map((board) => (
              <option key={board.id} value={board.slug}>
                {board.name}
              </option>
            ))}
          </Select>
        </label>

        <label className="space-y-1 text-sm text-foreground">
          <span>Grade</span>
          <Select name="grade" defaultValue={selected.grade ?? ""}>
            <option value="">All grades</option>
            <option value="9">Grade 9</option>
            <option value="10">Grade 10</option>
          </Select>
        </label>

        <label className="space-y-1 text-sm text-foreground">
          <span>Subject</span>
          <Select
            name="subjectId"
            defaultValue={selected.subjectId ? String(selected.subjectId) : ""}
          >
            <option value="">All subjects</option>
            {filteredSubjects.map((subject) => (
              <option key={subject.id} value={String(subject.id)}>
                {subject.name} (Grade {subject.grade})
              </option>
            ))}
          </Select>
        </label>

        <label className="space-y-1 text-sm text-foreground">
          <span>Chapter</span>
          <Select
            name="chapterId"
            defaultValue={selected.chapterId ? String(selected.chapterId) : ""}
          >
            <option value="">All chapters</option>
            {filteredChapters.map((chapter) => (
              <option key={chapter.id} value={String(chapter.id)}>
                Chapter {chapter.chapterNumber}: {chapter.title}
              </option>
            ))}
          </Select>
        </label>

        <label className="space-y-1 text-sm text-foreground">
          <span>Status</span>
          <Select name="solved" defaultValue={selected.solved}>
            <option value="all">All threads</option>
            <option value="solved">Solved</option>
            <option value="unsolved">Unsolved</option>
          </Select>
        </label>

        <div className="flex items-center gap-3 md:col-span-6">
          <Button type="submit" size="sm">
            Apply filters
          </Button>
          <Link href="/forum">
            <Button type="button" size="sm" variant="ghost">
              Reset
            </Button>
          </Link>

          {createThreadHref ? (
            <Link href={createThreadHref}>
              <Button type="button" size="sm" variant="secondary">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Create thread
              </Button>
            </Link>
          ) : null}
        </div>
      </form>
    </section>
  );
}

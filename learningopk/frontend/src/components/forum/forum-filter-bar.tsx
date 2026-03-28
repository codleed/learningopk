"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Filter, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { ForumFiltersResponse } from "@/lib/forum-api";
import { buildForumHref } from "@/lib/forum-utils";
import { cn } from "@/lib/utils";

type ForumFilterBarProps = {
  filters: ForumFiltersResponse;
  topContent?: ReactNode;
  createThreadHref?: string;
  selected: {
    q?: string;
    board?: string;
    grade?: string;
    subjectId?: number;
    chapterId?: number;
    solved: "all" | "solved" | "unsolved";
  };
};

type QuickFilter = "all" | "solved" | "unsolved";

const quickFilters: { key: QuickFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "solved", label: "Solved" },
  { key: "unsolved", label: "Unsolved" },
];

export function ForumFilterBar({
  filters,
  topContent,
  createThreadHref,
  selected,
}: ForumFilterBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const filteredSubjects = filters.subjects.filter((subject) => {
    if (selected.board) {
      const board = filters.boards.find(
        (option) => option.id === subject.boardId,
      );
      if (!board || board.slug !== selected.board) {
        return false;
      }
    }

    if (selected.grade && subject.classSlug !== selected.grade) {
      return false;
    }

    return true;
  });

  const filteredClasses = filters.classes.filter((entry) => {
    if (!selected.board) {
      return true;
    }

    const board = filters.boards.find((boardOption) => boardOption.id === entry.boardId);
    return board?.slug === selected.board;
  });

  const filteredChapters = filters.chapters.filter((chapter) => {
    if (!selected.subjectId) {
      return true;
    }

    return chapter.subjectId === selected.subjectId;
  });

  const hasActiveFilters = selected.board || selected.grade || selected.subjectId || selected.q;

  return (
    <section className="surface-card rounded-xl border border-border p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">
          Forum Threads
        </h2>
        <div className="flex items-center gap-2">
          {createThreadHref && (
            <Link href={createThreadHref}>
              <Button type="button" size="sm">
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">New Thread</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {topContent ? <div className="mb-4">{topContent}</div> : null}

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <form method="GET" className="flex-1 min-w-[200px]">
            <Input
              name="q"
              defaultValue={selected.q ?? ""}
              placeholder="Search threads..."
              className="w-full"
            />
          </form>

          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
            {quickFilters.map((filter) => (
              <Link
                key={filter.key}
                href={`/forum?solved=${filter.key}${selected.q ? `&q=${selected.q}` : ""}`}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  (selected.solved === filter.key || (selected.solved === "all" && filter.key === "all"))
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {filter.label}
              </Link>
            ))}
          </div>

          <Button
            type="button"
            variant={showAdvanced || hasActiveFilters ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <Filter className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Filters</span>
            {hasActiveFilters && (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-primary-foreground">
                {(selected.board ? 1 : 0) + (selected.grade ? 1 : 0) + (selected.subjectId ? 1 : 0)}
              </span>
            )}
          </Button>
        </div>

        {showAdvanced && (
          <form method="GET" className="grid gap-3 md:grid-cols-4 animate-fade-in">
            <input type="hidden" name="solved" value={selected.solved} />

            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Board</span>
              <Select name="board" defaultValue={selected.board ?? ""} className="w-full">
                <option value="">All boards</option>
                {filters.boards.map((board) => (
                  <option key={board.id} value={board.slug}>
                    {board.name}
                  </option>
                ))}
              </Select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Class</span>
              <Select name="grade" defaultValue={selected.grade ?? ""} className="w-full">
                <option value="">All classes</option>
                {filteredClasses.map((entry) => (
                  <option key={entry.id} value={entry.slug}>
                    {entry.name}
                  </option>
                ))}
              </Select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Subject</span>
              <Select
                name="subjectId"
                defaultValue={selected.subjectId ? String(selected.subjectId) : ""}
                className="w-full"
              >
                <option value="">All subjects</option>
                {filteredSubjects.map((subject) => (
                  <option key={subject.id} value={String(subject.id)}>
                    {subject.name}
                    {subject.className ? ` (${subject.className})` : ""}
                  </option>
                ))}
              </Select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Chapter</span>
              <Select
                name="chapterId"
                defaultValue={selected.chapterId ? String(selected.chapterId) : ""}
                className="w-full"
              >
                <option value="">All chapters</option>
                {filteredChapters.map((chapter) => (
                  <option key={chapter.id} value={String(chapter.id)}>
                    Chapter {chapter.chapterNumber}: {chapter.title}
                  </option>
                ))}
              </Select>
            </label>

            <div className="flex items-end gap-2 md:col-span-4">
              <Button type="submit" size="sm">
                Apply Filters
              </Button>
              <Link href={buildForumHref({ q: selected.q })}>
                <Button type="button" size="sm" variant="ghost">
                  Reset
                </Button>
              </Link>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

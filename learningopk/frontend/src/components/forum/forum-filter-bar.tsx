"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Filter, Plus, Search, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { ForumFiltersResponse } from "@/lib/forum-api";
import { buildForumHref } from "@/lib/forum-utils";
import type { SessionPayload } from "@/lib/session";
import { cn } from "@/lib/utils";

import { Sheet, SheetHeader, SheetBody, SheetTitle, SheetDescription } from "@/components/ui/sheet";

type ForumFilterBarProps = {
  filters: ForumFiltersResponse;
  topContent?: ReactNode;
  createThreadHref?: string;
  session?: SessionPayload | null;
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
  session,
  selected,
}: ForumFilterBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const filteredSubjects = filters.subjects.filter((subject) => {
    if (selected.board) {
      const board = filters.boards.find((option) => option.id === subject.boardId);
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

  const activeFilterCount =
    (selected.board ? 1 : 0) + (selected.grade ? 1 : 0) + (selected.subjectId ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0 || Boolean(selected.q);

  return (
    <div className="space-y-3">
      {topContent ? (
        <div className="rounded-lg border border-border-default bg-bg-subtle/50 px-4 py-3">
          {topContent}
        </div>
      ) : null}

      {/* ── Main toolbar row ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search — hidden inputs preserve all active filters */}
        <form method="GET" className="min-w-[180px] flex-1">
          {selected.board ? <input type="hidden" name="board" value={selected.board} /> : null}
          {selected.grade ? <input type="hidden" name="grade" value={selected.grade} /> : null}
          {selected.subjectId ? (
            <input type="hidden" name="subjectId" value={String(selected.subjectId)} />
          ) : null}
          {selected.chapterId ? (
            <input type="hidden" name="chapterId" value={String(selected.chapterId)} />
          ) : null}
          {selected.solved !== "all" ? (
            <input type="hidden" name="solved" value={selected.solved} />
          ) : null}
          <Input
            name="q"
            defaultValue={selected.q ?? ""}
            placeholder="Search threads..."
            inputSize="sm"
            prefix={<Search />}
          />
        </form>

        {/* Quick filter pills */}
        <div className="flex items-center gap-0.5 rounded-lg border border-border-default bg-bg-subtle/50 p-0.5">
          {quickFilters.map((filter) => (
            <Link
              key={filter.key}
              href={buildForumHref({
                q: selected.q,
                board: selected.board,
                grade: selected.grade,
                subjectId: selected.subjectId,
                chapterId: selected.chapterId,
                solved: filter.key,
              })}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-150",
                selected.solved === filter.key
                  ? "bg-bg-surface text-text-primary shadow-[var(--shadow-sm)]"
                  : "text-text-muted hover:text-text-secondary"
              )}
            >
              {filter.label}
            </Link>
          ))}
        </div>

        {/* Filters button (desktop) */}
        <Button
          type="button"
          variant={showAdvanced || hasActiveFilters ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="hidden lg:inline-flex"
          iconLeft={<Filter />}
        >
          Filters
          {activeFilterCount > 0 ? (
            <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent-primary text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          ) : null}
        </Button>

        {/* Filters button (mobile — opens Sheet) */}
        <Button
          type="button"
          variant={hasActiveFilters ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setMobileFiltersOpen(true)}
          className="lg:hidden"
          iconLeft={<Filter />}
        >
          {activeFilterCount > 0 ? (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent-primary text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          ) : null}
        </Button>

        {/* New Post button */}
        {createThreadHref ? (
          <Link href={createThreadHref}>
            <Button type="button" size="sm" variant="primary" iconLeft={<Plus />}>
              <span className="hidden sm:inline">New Post</span>
            </Button>
          </Link>
        ) : null}
      </div>

      {/* ── Advanced Filters (desktop inline) ── */}
      <AnimatePresence>
        {showAdvanced ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <form
              method="GET"
              className="rounded-xl border border-border-default bg-bg-surface p-4"
            >
              <input type="hidden" name="solved" value={selected.solved} />
              {selected.q ? <input type="hidden" name="q" value={selected.q} /> : null}

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Board
                  </span>
                  <Select
                    name="board"
                    defaultValue={selected.board ?? ""}
                    className="!h-9 !text-sm"
                  >
                    <option value="">All boards</option>
                    {filters.boards.map((board) => (
                      <option key={board.id} value={board.slug}>
                        {board.name}
                      </option>
                    ))}
                  </Select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Class
                  </span>
                  <Select
                    name="grade"
                    defaultValue={selected.grade ?? ""}
                    className="!h-9 !text-sm"
                  >
                    <option value="">All classes</option>
                    {filteredClasses.map((entry) => (
                      <option key={entry.id} value={entry.slug}>
                        {entry.name}
                      </option>
                    ))}
                  </Select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Subject
                  </span>
                  <Select
                    name="subjectId"
                    defaultValue={selected.subjectId ? String(selected.subjectId) : ""}
                    className="!h-9 !text-sm"
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

                <label className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Chapter
                  </span>
                  <Select
                    name="chapterId"
                    defaultValue={selected.chapterId ? String(selected.chapterId) : ""}
                    className="!h-9 !text-sm"
                  >
                    <option value="">All chapters</option>
                    {filteredChapters.map((chapter) => (
                      <option key={chapter.id} value={String(chapter.id)}>
                        Ch. {chapter.chapterNumber}: {chapter.title}
                      </option>
                    ))}
                  </Select>
                </label>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Button type="submit" size="sm" variant="primary">
                  Apply
                </Button>
                <Link href={buildForumHref({ q: selected.q })}>
                  <Button type="button" size="sm" variant="ghost" iconLeft={<X />}>
                    Reset
                  </Button>
                </Link>
              </div>
            </form>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ── Mobile Filter Sheet ── */}
      <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen} side="bottom">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>
            Narrow down threads by board, class, subject, and chapter.
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <form method="GET" className="space-y-4">
            <input type="hidden" name="solved" value={selected.solved} />
            {selected.q ? <input type="hidden" name="q" value={selected.q} /> : null}

            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Board
              </span>
              <Select name="board" defaultValue={selected.board ?? ""}>
                <option value="">All boards</option>
                {filters.boards.map((board) => (
                  <option key={board.id} value={board.slug}>
                    {board.name}
                  </option>
                ))}
              </Select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Class
              </span>
              <Select name="grade" defaultValue={selected.grade ?? ""}>
                <option value="">All classes</option>
                {filteredClasses.map((entry) => (
                  <option key={entry.id} value={entry.slug}>
                    {entry.name}
                  </option>
                ))}
              </Select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Subject
              </span>
              <Select
                name="subjectId"
                defaultValue={selected.subjectId ? String(selected.subjectId) : ""}
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

            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Chapter
              </span>
              <Select
                name="chapterId"
                defaultValue={selected.chapterId ? String(selected.chapterId) : ""}
              >
                <option value="">All chapters</option>
                {filteredChapters.map((chapter) => (
                  <option key={chapter.id} value={String(chapter.id)}>
                    Ch. {chapter.chapterNumber}: {chapter.title}
                  </option>
                ))}
              </Select>
            </label>

            <div className="flex items-center gap-2 pt-2">
              <Button type="submit" variant="primary" width="full">
                Apply Filters
              </Button>
              <Link href={buildForumHref({ q: selected.q })} className="w-full">
                <Button type="button" variant="ghost" width="full">
                  Reset
                </Button>
              </Link>
            </div>
          </form>
        </SheetBody>
      </Sheet>
    </div>
  );
}

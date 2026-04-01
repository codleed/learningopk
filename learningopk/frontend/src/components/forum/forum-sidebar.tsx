"use client";

import Link from "next/link";
import { BookOpen, GraduationCap, Layers } from "lucide-react";

import { SubjectBadge } from "@/components/common/subject-badge";
import { BoardBadge } from "@/components/common/board-badge";
import type { ForumFiltersResponse } from "@/lib/forum-api";
import { buildForumHref } from "@/lib/forum-utils";
import { cn } from "@/lib/utils";

type ForumSidebarProps = {
  filters: ForumFiltersResponse;
  selected: {
    q?: string;
    board?: string;
    grade?: string;
    subjectId?: number;
    chapterId?: number;
    solved: "all" | "solved" | "unsolved";
  };
};

export function ForumSidebar({ filters, selected }: ForumSidebarProps) {
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

  return (
    <div className="sticky top-6 space-y-5">
      {/* ── Board Filter ── */}
      {filters.boards.length > 0 ? (
        <nav className="rounded-xl border border-border-default bg-bg-surface p-4" aria-label="Board filter">
          <div className="mb-2.5 flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-text-muted" aria-hidden="true" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">Board</h3>
          </div>
          <ul className="space-y-1">
            <li>
              <Link
                href={buildForumHref({
                  q: selected.q,
                  grade: selected.grade,
                  subjectId: selected.subjectId,
                  chapterId: selected.chapterId,
                  solved: selected.solved
                })}
                className={cn(
                  "block rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-150",
                  !selected.board
                    ? "bg-accent-primary/10 text-accent-primary"
                    : "text-text-secondary hover:bg-bg-subtle hover:text-text-primary"
                )}
              >
                All Boards
              </Link>
            </li>
            {filters.boards.map((board) => (
              <li key={board.id}>
                <Link
                  href={buildForumHref({
                    q: selected.q,
                    board: board.slug,
                    grade: selected.grade,
                    subjectId: selected.subjectId,
                    chapterId: selected.chapterId,
                    solved: selected.solved
                  })}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2.5 py-1.5 transition-all duration-150",
                    selected.board === board.slug
                      ? "bg-accent-primary/10"
                      : "hover:bg-bg-subtle"
                  )}
                >
                  <BoardBadge board={board.slug} size="sm" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      {/* ── Subject Filter Tags ── */}
      {filteredSubjects.length > 0 ? (
        <nav className="rounded-xl border border-border-default bg-bg-surface p-4" aria-label="Subject filter">
          <div className="mb-2.5 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-text-muted" aria-hidden="true" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">Subjects</h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Link
              href={buildForumHref({
                q: selected.q,
                board: selected.board,
                grade: selected.grade,
                solved: selected.solved
              })}
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all duration-150",
                !selected.subjectId
                  ? "bg-accent-primary/10 text-accent-primary ring-1 ring-accent-primary/20"
                  : "bg-bg-subtle text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
              )}
            >
              All
            </Link>
            {filteredSubjects.map((subject) => {
              const isActive = selected.subjectId === subject.id;
              return (
                <Link
                  key={subject.id}
                  href={buildForumHref({
                    q: selected.q,
                    board: selected.board,
                    grade: selected.grade,
                    subjectId: subject.id,
                    solved: selected.solved
                  })}
                  className={cn(
                    "transition-all duration-150",
                    isActive ? "ring-1 ring-accent-primary/30 rounded-full" : "opacity-80 hover:opacity-100"
                  )}
                >
                  <SubjectBadge name={subject.name} size="sm" />
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}

      {/* ── Class Filter ── */}
      {filters.classes.length > 0 ? (
        <nav className="rounded-xl border border-border-default bg-bg-surface p-4" aria-label="Class filter">
          <div className="mb-2.5 flex items-center gap-2">
            <Layers className="h-4 w-4 text-text-muted" aria-hidden="true" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">Class</h3>
          </div>
          <ul className="space-y-1">
            <li>
              <Link
                href={buildForumHref({
                  q: selected.q,
                  board: selected.board,
                  subjectId: selected.subjectId,
                  chapterId: selected.chapterId,
                  solved: selected.solved
                })}
                className={cn(
                  "block rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-150",
                  !selected.grade
                    ? "bg-accent-primary/10 text-accent-primary"
                    : "text-text-secondary hover:bg-bg-subtle hover:text-text-primary"
                )}
              >
                All Classes
              </Link>
            </li>
            {filters.classes
              .filter((entry) => {
                if (!selected.board) return true;
                const board = filters.boards.find((b) => b.id === entry.boardId);
                return board?.slug === selected.board;
              })
              .map((entry) => (
                <li key={entry.id}>
                  <Link
                    href={buildForumHref({
                      q: selected.q,
                      board: selected.board,
                      grade: entry.slug,
                      subjectId: selected.subjectId,
                      chapterId: selected.chapterId,
                      solved: selected.solved
                    })}
                    className={cn(
                      "block rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-150",
                      selected.grade === entry.slug
                        ? "bg-accent-primary/10 text-accent-primary"
                        : "text-text-secondary hover:bg-bg-subtle hover:text-text-primary"
                    )}
                  >
                    {entry.name}
                  </Link>
                </li>
              ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}

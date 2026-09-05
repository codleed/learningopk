"use client";

import { useEffect, useState } from "react";

import type { AdminCurriculumBoard } from "@/lib/admin-api";

import { Button } from "../../ui/button";

type CurriculumTreeProps = {
  boards: AdminCurriculumBoard[];
  isRefreshing: boolean;
  refreshTree: () => Promise<void>;
};

export function CurriculumTree({ boards, isRefreshing, refreshTree }: CurriculumTreeProps) {
  const [expandedBoardIds, setExpandedBoardIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    setExpandedBoardIds((current) => {
      const validBoardIds = new Set(boards.map((board) => board.id));
      const next = new Set<number>();
      for (const boardId of current) {
        if (validBoardIds.has(boardId)) {
          next.add(boardId);
        }
      }
      return next;
    });
  }, [boards]);

  const toggleBoard = (boardId: number) => {
    setExpandedBoardIds((current) => {
      const next = new Set(current);
      if (next.has(boardId)) {
        next.delete(boardId);
      } else {
        next.add(boardId);
      }
      return next;
    });
  };

  return (
    <div className="rounded-lg border border-border-default/70 p-3" data-testid="curriculum-tree">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-text-primary">Curriculum Tree</p>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={refreshTree}
          disabled={isRefreshing}
        >
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <div className="space-y-2 text-sm">
        {boards.length === 0 ? <p className="text-text-secondary">No boards yet.</p> : null}
        {boards.map((board) => (
          <div key={board.id} className="rounded-md border border-border-default/60 p-2">
            <button
              type="button"
              className="flex w-full items-center gap-2 text-left"
              aria-label={`Toggle ${board.name}`}
              onClick={() => toggleBoard(board.id)}
            >
              <span className="text-text-secondary">
                {expandedBoardIds.has(board.id) ? "-" : "+"}
              </span>
              <span className="font-semibold text-text-primary">{board.name}</span>
            </button>

            {expandedBoardIds.has(board.id) ? (
              <div className="mt-2 space-y-2 pl-6">
                {board.classes.length === 0 ? (
                  <p className="text-text-secondary">No classes</p>
                ) : null}
                {board.classes.map((boardClass) => (
                  <div key={boardClass.id} className="space-y-1">
                    <p className="font-medium text-text-primary/90">- {boardClass.name}</p>
                    {boardClass.subjects.length === 0 ? (
                      <p className="pl-4 text-text-secondary">No subjects</p>
                    ) : (
                      <ul className="space-y-1 pl-4 text-text-primary/80">
                        {boardClass.subjects.map((subject) => (
                          <li key={subject.id}>
                            - {subject.name} ({subject.chapters.length} chapter
                            {subject.chapters.length === 1 ? "" : "s"})
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

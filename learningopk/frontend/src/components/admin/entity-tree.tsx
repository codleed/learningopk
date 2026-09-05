"use client";

import { useState } from "react";
import { Book, BookOpen, ChevronDown, ChevronRight, FileText, GraduationCap } from "lucide-react";

import type { AdminCurriculumBoard } from "@/lib/admin-api";

type EntityTreeProps = {
  boards: AdminCurriculumBoard[];
  selectedId?: number;
  selectedType?: "board" | "class" | "subject" | "chapter";
  onSelect: (entity: {
    id: number;
    type: "board" | "class" | "subject" | "chapter";
    name: string;
  }) => void;
};

type EntityType = "board" | "class" | "subject" | "chapter";

interface TreeItemProps {
  id: number;
  name: string;
  type: EntityType;
  level: number;
  isExpanded: boolean;
  isSelected: boolean;
  hasChildren: boolean;
  onToggle: () => void;
  onSelect: () => void;
  children?: React.ReactNode;
}

function TreeItem({
  id,
  name,
  type,
  level,
  isExpanded,
  isSelected,
  hasChildren,
  onToggle,
  onSelect,
  children,
}: TreeItemProps) {
  const indent = level * 16; // --space-4 = 16px

  const handleChevronClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle();
  };

  const handleNameClick = () => {
    onSelect();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect();
    } else if (e.key === "ArrowRight" && hasChildren && !isExpanded) {
      e.preventDefault();
      onToggle();
    } else if (e.key === "ArrowLeft" && hasChildren && isExpanded) {
      e.preventDefault();
      onToggle();
    }
  };

  return (
    <div role="treeitem" aria-expanded={hasChildren ? isExpanded : undefined}>
      <div
        className="flex items-center gap-1 py-1.5 cursor-pointer select-none"
        style={{ paddingLeft: `${indent}px` }}
        onClick={handleNameClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={handleChevronClick}
            className="p-0.5 rounded hover:bg-[var(--bg-subtle)] transition-colors"
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-[var(--text-secondary)]" aria-hidden />
            ) : (
              <ChevronRight className="h-4 w-4 text-[var(--text-secondary)]" aria-hidden />
            )}
          </button>
        ) : (
          <span className="w-5" aria-hidden />
        )}

        {type === "board" && (
          <BookOpen className="h-4 w-4 text-[var(--primary)] shrink-0" aria-hidden />
        )}
        {type === "class" && (
          <GraduationCap className="h-4 w-4 text-[var(--primary)] shrink-0" aria-hidden />
        )}
        {type === "subject" && (
          <Book className="h-4 w-4 text-[var(--primary)] shrink-0" aria-hidden />
        )}
        {type === "chapter" && (
          <FileText className="h-4 w-4 text-[var(--primary)] shrink-0" aria-hidden />
        )}

        <span
          className={`font-body text-[0.875rem] ${
            isSelected ? "text-[var(--text-primary)]" : "text-[var(--text-primary)]"
          }`}
          style={{
            backgroundColor: isSelected ? "rgba(122, 201, 67, 0.15)" : undefined,
            borderRadius: "var(--radius-md)",
            padding: isSelected ? "2px 6px" : undefined,
          }}
        >
          {type === "chapter" ? `${name}` : name}
        </span>
      </div>

      {hasChildren && isExpanded && <div role="group">{children}</div>}
    </div>
  );
}

export function AdminEntityTree({ boards, selectedId, selectedType, onSelect }: EntityTreeProps) {
  const [expandedBoards, setExpandedBoards] = useState<Set<number>>(new Set());
  const [expandedClasses, setExpandedClasses] = useState<Set<number>>(new Set());
  const [expandedSubjects, setExpandedSubjects] = useState<Set<number>>(new Set());

  const toggleBoard = (boardId: number) => {
    setExpandedBoards((prev) => {
      const next = new Set(prev);
      if (next.has(boardId)) {
        next.delete(boardId);
      } else {
        next.add(boardId);
      }
      return next;
    });
  };

  const toggleClass = (classId: number) => {
    setExpandedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(classId)) {
        next.delete(classId);
      } else {
        next.add(classId);
      }
      return next;
    });
  };

  const toggleSubject = (subjectId: number) => {
    setExpandedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(subjectId)) {
        next.delete(subjectId);
      } else {
        next.add(subjectId);
      }
      return next;
    });
  };

  const isSelected = (id: number, type: EntityType) => {
    return selectedId === id && selectedType === type;
  };

  if (boards.length === 0) {
    return (
      <div className="py-8 text-center text-[var(--text-secondary)] text-sm">
        No boards yet. Create your first board to get started.
      </div>
    );
  }

  return (
    <div className="py-2" role="tree">
      {boards.map((board) => {
        const isBoardExpanded = expandedBoards.has(board.id);
        const hasClasses = board.classes.length > 0;

        return (
          <TreeItem
            key={board.id}
            id={board.id}
            name={board.name}
            type="board"
            level={0}
            isExpanded={isBoardExpanded}
            isSelected={isSelected(board.id, "board")}
            hasChildren={hasClasses}
            onToggle={() => toggleBoard(board.id)}
            onSelect={() => onSelect({ id: board.id, type: "board", name: board.name })}
          >
            {board.classes.map((boardClass) => {
              const isClassExpanded = expandedClasses.has(boardClass.id);
              const hasSubjects = boardClass.subjects.length > 0;

              return (
                <TreeItem
                  key={boardClass.id}
                  id={boardClass.id}
                  name={boardClass.name}
                  type="class"
                  level={1}
                  isExpanded={isClassExpanded}
                  isSelected={isSelected(boardClass.id, "class")}
                  hasChildren={hasSubjects}
                  onToggle={() => toggleClass(boardClass.id)}
                  onSelect={() =>
                    onSelect({
                      id: boardClass.id,
                      type: "class",
                      name: boardClass.name,
                    })
                  }
                >
                  {boardClass.subjects.map((subject) => {
                    const isSubjectExpanded = expandedSubjects.has(subject.id);
                    const hasChapters = subject.chapters.length > 0;

                    return (
                      <TreeItem
                        key={subject.id}
                        id={subject.id}
                        name={subject.name}
                        type="subject"
                        level={2}
                        isExpanded={isSubjectExpanded}
                        isSelected={isSelected(subject.id, "subject")}
                        hasChildren={hasChapters}
                        onToggle={() => toggleSubject(subject.id)}
                        onSelect={() =>
                          onSelect({
                            id: subject.id,
                            type: "subject",
                            name: subject.name,
                          })
                        }
                      >
                        {subject.chapters.map((chapter) => (
                          <TreeItem
                            key={chapter.id}
                            id={chapter.id}
                            name={`Chapter ${chapter.chapterNumber}: ${chapter.title}`}
                            type="chapter"
                            level={3}
                            isExpanded={false}
                            isSelected={isSelected(chapter.id, "chapter")}
                            hasChildren={false}
                            onToggle={() => {}}
                            onSelect={() =>
                              onSelect({
                                id: chapter.id,
                                type: "chapter",
                                name: chapter.title,
                              })
                            }
                          />
                        ))}
                      </TreeItem>
                    );
                  })}
                </TreeItem>
              );
            })}
          </TreeItem>
        );
      })}
    </div>
  );
}

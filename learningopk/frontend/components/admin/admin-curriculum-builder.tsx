"use client";

import { useMemo, useState, type FormEvent } from "react";

import {
  createAdminCurriculumBoard,
  createAdminCurriculumChapter,
  createAdminCurriculumClass,
  createAdminCurriculumSubject,
  getAdminCurriculumTree,
  type AdminCurriculumBoard
} from "@/lib/admin-api";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select } from "../ui/select";
import { useToast } from "../ui/toast";

type AdminCurriculumBuilderProps = {
  initialBoards: AdminCurriculumBoard[];
};

const toSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function AdminCurriculumBuilder({ initialBoards }: AdminCurriculumBuilderProps) {
  const { pushToast } = useToast();
  const [boards, setBoards] = useState(initialBoards);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [boardName, setBoardName] = useState("");
  const [classBoardId, setClassBoardId] = useState("");
  const [className, setClassName] = useState("");
  const [subjectBoardClassId, setSubjectBoardClassId] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [subjectDescription, setSubjectDescription] = useState("");
  const [chapterSubjectId, setChapterSubjectId] = useState("");
  const [chapterNumber, setChapterNumber] = useState("1");
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterSummary, setChapterSummary] = useState("");

  const classOptions = useMemo(
    () =>
      boards.flatMap((board) =>
        board.classes.map((boardClass) => ({
          id: boardClass.id,
          label: `${board.name} / ${boardClass.name}`
        }))
      ),
    [boards]
  );

  const subjectOptions = useMemo(
    () =>
      boards.flatMap((board) =>
        board.classes.flatMap((boardClass) =>
          boardClass.subjects.map((subject) => ({
            id: subject.id,
            label: `${board.name} / ${boardClass.name} / ${subject.name}`
          }))
        )
      ),
    [boards]
  );

  const refreshTree = async () => {
    setIsRefreshing(true);
    try {
      const nextBoards = await getAdminCurriculumTree();
      setBoards(nextBoards);
    } catch {
      pushToast({
        title: "Failed to refresh curriculum",
        tone: "error"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const submitBoard = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedName = boardName.trim();
    if (!normalizedName) {
      return;
    }
    setIsSubmitting(true);
    try {
      await createAdminCurriculumBoard({
        name: normalizedName,
        slug: toSlug(normalizedName)
      });
      setBoardName("");
      await refreshTree();
      pushToast({ title: "Board created", tone: "success" });
    } catch {
      pushToast({ title: "Could not create board", tone: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitClass = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const boardId = Number(classBoardId);
    const normalizedName = className.trim();
    if (!boardId || !normalizedName) {
      return;
    }
    setIsSubmitting(true);
    try {
      await createAdminCurriculumClass({
        boardId,
        name: normalizedName,
        slug: toSlug(normalizedName)
      });
      setClassName("");
      await refreshTree();
      pushToast({ title: "Class created", tone: "success" });
    } catch {
      pushToast({ title: "Could not create class", tone: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitSubject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const boardClassId = Number(subjectBoardClassId);
    const normalizedName = subjectName.trim();
    if (!boardClassId || !normalizedName) {
      return;
    }
    setIsSubmitting(true);
    try {
      await createAdminCurriculumSubject({
        boardClassId,
        name: normalizedName,
        slug: toSlug(normalizedName),
        ...(subjectDescription.trim().length > 0 ? { description: subjectDescription.trim() } : {})
      });
      setSubjectName("");
      setSubjectDescription("");
      await refreshTree();
      pushToast({ title: "Subject created", tone: "success" });
    } catch {
      pushToast({ title: "Could not create subject", tone: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitChapter = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const subjectId = Number(chapterSubjectId);
    const chapterNumberValue = Number(chapterNumber);
    const title = chapterTitle.trim();
    const summary = chapterSummary.trim();
    if (!subjectId || !chapterNumberValue || !title || !summary) {
      return;
    }
    setIsSubmitting(true);
    try {
      await createAdminCurriculumChapter({
        subjectId,
        chapterNumber: chapterNumberValue,
        title,
        slug: toSlug(title),
        summary
      });
      setChapterNumber("1");
      setChapterTitle("");
      setChapterSummary("");
      await refreshTree();
      pushToast({ title: "Chapter created", tone: "success" });
    } catch {
      pushToast({ title: "Could not create chapter", tone: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-2">
        <form
          className="space-y-2 rounded-lg border border-border/70 p-3"
          data-testid="curriculum-board-form"
          onSubmit={submitBoard}
        >
          <p className="text-sm font-semibold text-foreground">Add Board</p>
          <Input
            data-testid="curriculum-board-name-input"
            value={boardName}
            onChange={(event) => setBoardName(event.target.value)}
            placeholder="Board name (e.g. Punjab Board)"
          />
          <Button data-testid="curriculum-board-submit" type="submit" size="sm" variant="secondary" disabled={isSubmitting}>
            Add board
          </Button>
        </form>

        <form
          className="space-y-2 rounded-lg border border-border/70 p-3"
          data-testid="curriculum-class-form"
          onSubmit={submitClass}
        >
          <p className="text-sm font-semibold text-foreground">Add Class</p>
          <Select
            data-testid="curriculum-class-board-select"
            value={classBoardId}
            onChange={(event) => setClassBoardId(event.target.value)}
          >
            <option value="">Select board</option>
            {boards.map((board) => (
              <option key={board.id} value={board.id}>
                {board.name}
              </option>
            ))}
          </Select>
          <Input
            data-testid="curriculum-class-name-input"
            value={className}
            onChange={(event) => setClassName(event.target.value)}
            placeholder="Class name (e.g. 9th)"
          />
          <Button data-testid="curriculum-class-submit" type="submit" size="sm" variant="secondary" disabled={isSubmitting}>
            Add class
          </Button>
        </form>

        <form
          className="space-y-2 rounded-lg border border-border/70 p-3"
          data-testid="curriculum-subject-form"
          onSubmit={submitSubject}
        >
          <p className="text-sm font-semibold text-foreground">Add Subject</p>
          <Select
            data-testid="curriculum-subject-class-select"
            value={subjectBoardClassId}
            onChange={(event) => setSubjectBoardClassId(event.target.value)}
          >
            <option value="">Select class</option>
            {classOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
          <Input
            data-testid="curriculum-subject-name-input"
            value={subjectName}
            onChange={(event) => setSubjectName(event.target.value)}
            placeholder="Subject name (e.g. Physics)"
          />
          <Input
            data-testid="curriculum-subject-description-input"
            value={subjectDescription}
            onChange={(event) => setSubjectDescription(event.target.value)}
            placeholder="Description (optional)"
          />
          <Button
            data-testid="curriculum-subject-submit"
            type="submit"
            size="sm"
            variant="secondary"
            disabled={isSubmitting}
          >
            Add subject
          </Button>
        </form>

        <form
          className="space-y-2 rounded-lg border border-border/70 p-3"
          data-testid="curriculum-chapter-form"
          onSubmit={submitChapter}
        >
          <p className="text-sm font-semibold text-foreground">Add Chapter</p>
          <Select
            data-testid="curriculum-chapter-subject-select"
            value={chapterSubjectId}
            onChange={(event) => setChapterSubjectId(event.target.value)}
          >
            <option value="">Select subject</option>
            {subjectOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
          <Input
            data-testid="curriculum-chapter-number-input"
            type="number"
            min={1}
            value={chapterNumber}
            onChange={(event) => setChapterNumber(event.target.value)}
            placeholder="Chapter number"
          />
          <Input
            data-testid="curriculum-chapter-title-input"
            value={chapterTitle}
            onChange={(event) => setChapterTitle(event.target.value)}
            placeholder="Chapter title"
          />
          <Input
            data-testid="curriculum-chapter-summary-input"
            value={chapterSummary}
            onChange={(event) => setChapterSummary(event.target.value)}
            placeholder="Chapter summary"
          />
          <Button
            data-testid="curriculum-chapter-submit"
            type="submit"
            size="sm"
            variant="secondary"
            disabled={isSubmitting}
          >
            Add chapter
          </Button>
        </form>
      </div>

      <div className="rounded-lg border border-border/70 p-3" data-testid="curriculum-tree">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Curriculum Tree</p>
          <Button type="button" size="sm" variant="secondary" onClick={refreshTree} disabled={isRefreshing}>
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>

        <div className="space-y-2 text-sm">
          {boards.length === 0 ? <p className="text-muted-foreground">No boards yet.</p> : null}
          {boards.map((board) => (
            <div key={board.id} className="rounded-md border border-border/60 p-2">
              <p className="font-semibold text-foreground">{board.name}</p>
              <div className="mt-2 space-y-2 pl-3">
                {board.classes.length === 0 ? <p className="text-muted-foreground">No classes</p> : null}
                {board.classes.map((boardClass) => (
                  <div key={boardClass.id}>
                    <p className="font-medium text-foreground/90">{boardClass.name}</p>
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-foreground/80">
                      {boardClass.subjects.map((subject) => (
                        <li key={subject.id}>
                          <span className="font-medium">{subject.name}</span>
                          {subject.chapters.length > 0 ? (
                            <span className="ml-1 text-muted-foreground">
                              ({subject.chapters.length} chapter{subject.chapters.length === 1 ? "" : "s"})
                            </span>
                          ) : (
                            <span className="ml-1 text-muted-foreground">(no chapters)</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

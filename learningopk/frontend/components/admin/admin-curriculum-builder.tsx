"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import {
  createAdminCurriculumBoard,
  createAdminCurriculumChapter,
  createAdminCurriculumClass,
  createAdminCurriculumExercise,
  createAdminCurriculumSubject,
  getAdminChapterSummary,
  getAdminCurriculumTree,
  updateAdminChapterSummary,
  uploadAdminChapterSummaryMedia,
  type AdminCurriculumBoard
} from "@/lib/admin-api";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { MarkdownMathRenderer } from "../learn/markdown-math-renderer";
import { Select } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { useToast } from "../ui/toast";

type AdminCurriculumBuilderProps = {
  initialBoards: AdminCurriculumBoard[];
};

type CurriculumFormTab = "board" | "class" | "subject" | "chapter" | "exercise";
type ExerciseType = "short" | "mcq" | "long" | "numerical";

const toSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const toPositiveInteger = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
    return null;
  }
  return parsed;
};

const buildSizedImageMarkdown = ({
  imageUrl,
  altText,
  width,
  height
}: {
  imageUrl: string;
  altText: string;
  width: string;
  height: string;
}): string => {
  const widthValue = toPositiveInteger(width);
  const heightValue = toPositiveInteger(height);
  const titleParts: string[] = [];
  if (widthValue) {
    titleParts.push(`width=${widthValue}`);
  }
  if (heightValue) {
    titleParts.push(`height=${heightValue}`);
  }
  const title = titleParts.length > 0 ? ` "${titleParts.join(" ")}"` : "";
  return `![${altText.trim() || "Chapter figure"}](${imageUrl}${title})`;
};

const insertAtSelection = ({
  source,
  insertion,
  start,
  end
}: {
  source: string;
  insertion: string;
  start: number;
  end: number;
}): { value: string; cursor: number } => {
  const safeStart = Math.max(0, Math.min(start, source.length));
  const safeEnd = Math.max(safeStart, Math.min(end, source.length));
  const nextValue = `${source.slice(0, safeStart)}${insertion}${source.slice(safeEnd)}`;
  return {
    value: nextValue,
    cursor: safeStart + insertion.length
  };
};

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
  const [summaryEditorChapterId, setSummaryEditorChapterId] = useState("");
  const [summaryEditorContent, setSummaryEditorContent] = useState("");
  const [summaryEditorImageAlt, setSummaryEditorImageAlt] = useState("Figure");
  const [summaryEditorImageWidth, setSummaryEditorImageWidth] = useState("640");
  const [summaryEditorImageHeight, setSummaryEditorImageHeight] = useState("");
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [isSummarySaving, setIsSummarySaving] = useState(false);
  const [isSummaryMediaUploading, setIsSummaryMediaUploading] = useState(false);
  const [exerciseChapterId, setExerciseChapterId] = useState("");
  const [exerciseType, setExerciseType] = useState<ExerciseType>("short");
  const [exerciseDifficulty, setExerciseDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [exerciseNumber, setExerciseNumber] = useState("");
  const [exerciseQuestion, setExerciseQuestion] = useState("");
  const [exerciseSolution, setExerciseSolution] = useState("");
  const [activeFormTab, setActiveFormTab] = useState<CurriculumFormTab>("board");
  const [expandedBoardIds, setExpandedBoardIds] = useState<Set<number>>(new Set());
  const summaryEditorInputRef = useRef<HTMLTextAreaElement | null>(null);
  const summaryEditorUploadInputRef = useRef<HTMLInputElement | null>(null);

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

  const chapterOptions = useMemo(
    () =>
      boards.flatMap((board) =>
        board.classes.flatMap((boardClass) =>
          boardClass.subjects.flatMap((subject) =>
            subject.chapters.map((chapter) => ({
              id: chapter.id,
              subjectName: subject.name,
              label: `${board.name} / ${boardClass.name} / ${subject.name} / Chapter ${chapter.chapterNumber}: ${chapter.title}`
            }))
          )
        )
      ),
    [boards]
  );

  const selectedExerciseChapter = useMemo(
    () => chapterOptions.find((option) => option.id === Number(exerciseChapterId)),
    [chapterOptions, exerciseChapterId]
  );

  const isPhysicsExerciseChapter = selectedExerciseChapter?.subjectName.toLowerCase().includes("physics") ?? false;

  const exerciseTypeOptions = useMemo(() => {
    const baseOptions: Array<{ value: ExerciseType; label: string }> = [
      { value: "short", label: "Comprehension Questions Short Questions" },
      { value: "mcq", label: "MCQs" },
      { value: "long", label: "Comprehension Questions Long Questions" }
    ];
    if (isPhysicsExerciseChapter) {
      baseOptions.push({ value: "numerical", label: "Numerical Problems" });
    }
    return baseOptions;
  }, [isPhysicsExerciseChapter]);

  useEffect(() => {
    if (exerciseType === "numerical" && !isPhysicsExerciseChapter) {
      setExerciseType("short");
    }
  }, [exerciseType, isPhysicsExerciseChapter]);

  useEffect(() => {
    if (!summaryEditorChapterId) {
      setSummaryEditorContent("");
      return;
    }

    let isCancelled = false;
    const chapterId = Number(summaryEditorChapterId);
    if (!chapterId) {
      setSummaryEditorContent("");
      return;
    }

    setIsSummaryLoading(true);
    getAdminChapterSummary(chapterId)
      .then((payload) => {
        if (!isCancelled) {
          setSummaryEditorContent(payload.chapter.summary);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setSummaryEditorContent("");
          pushToast({
            title: "Could not load chapter summary",
            tone: "error"
          });
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsSummaryLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [summaryEditorChapterId, pushToast]);

  useEffect(() => {
    if (!summaryEditorChapterId) {
      return;
    }

    const selectedId = Number(summaryEditorChapterId);
    if (!chapterOptions.some((option) => option.id === selectedId)) {
      setSummaryEditorChapterId("");
      setSummaryEditorContent("");
    }
  }, [chapterOptions, summaryEditorChapterId]);

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

  const submitExercise = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const chapterId = Number(exerciseChapterId);
    const normalizedExerciseNumber = exerciseNumber.trim();
    const question = exerciseQuestion.trim();
    const solution = exerciseSolution.trim();

    if (!chapterId || !normalizedExerciseNumber || !question || !solution) {
      return;
    }

    if (exerciseType === "numerical" && !isPhysicsExerciseChapter) {
      pushToast({ title: "Numerical problems are only for Physics chapters", tone: "error" });
      return;
    }

    setIsSubmitting(true);
    try {
      await createAdminCurriculumExercise({
        chapterId,
        exerciseNumber: normalizedExerciseNumber,
        question,
        solution,
        difficulty: exerciseDifficulty,
        type: exerciseType
      });
      setExerciseNumber("");
      setExerciseQuestion("");
      setExerciseSolution("");
      setExerciseDifficulty("medium");
      pushToast({ title: "Exercise created", tone: "success" });
    } catch {
      pushToast({ title: "Could not create exercise", tone: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveSummaryEditor = async () => {
    const chapterId = Number(summaryEditorChapterId);
    const summary = summaryEditorContent.trim();
    if (!chapterId || !summary) {
      pushToast({
        title: "Select a chapter and write summary first",
        tone: "error"
      });
      return;
    }

    setIsSummarySaving(true);
    try {
      await updateAdminChapterSummary({
        chapterId,
        summary
      });
      pushToast({
        title: "Chapter summary updated",
        tone: "success"
      });
    } catch {
      pushToast({
        title: "Could not save chapter summary",
        tone: "error"
      });
    } finally {
      setIsSummarySaving(false);
    }
  };

  const uploadSummaryFigure = async () => {
    const chapterId = Number(summaryEditorChapterId);
    if (!chapterId) {
      pushToast({
        title: "Select a chapter first",
        tone: "error"
      });
      return;
    }

    const file = summaryEditorUploadInputRef.current?.files?.[0];
    if (!file) {
      pushToast({
        title: "Choose an image file first",
        tone: "error"
      });
      return;
    }

    const textarea = summaryEditorInputRef.current;
    const selectionStart = textarea?.selectionStart ?? summaryEditorContent.length;
    const selectionEnd = textarea?.selectionEnd ?? summaryEditorContent.length;

    setIsSummaryMediaUploading(true);
    try {
      const payload = await uploadAdminChapterSummaryMedia({
        chapterId,
        file
      });
      const imageMarkdown = buildSizedImageMarkdown({
        imageUrl: payload.asset.objectUrl,
        altText: summaryEditorImageAlt,
        width: summaryEditorImageWidth,
        height: summaryEditorImageHeight
      });
      const insertion = `${imageMarkdown}\n`;

      let cursorAfterInsert = selectionStart + insertion.length;
      setSummaryEditorContent((current) => {
        const result = insertAtSelection({
          source: current,
          insertion,
          start: selectionStart,
          end: selectionEnd
        });
        cursorAfterInsert = result.cursor;
        return result.value;
      });

      requestAnimationFrame(() => {
        const input = summaryEditorInputRef.current;
        if (input) {
          input.focus();
          input.setSelectionRange(cursorAfterInsert, cursorAfterInsert);
        }
      });

      if (summaryEditorUploadInputRef.current) {
        summaryEditorUploadInputRef.current.value = "";
      }

      pushToast({
        title: "Figure uploaded and inserted",
        tone: "success"
      });
    } catch {
      pushToast({
        title: "Could not upload figure",
        tone: "error"
      });
    } finally {
      setIsSummaryMediaUploading(false);
    }
  };

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
    <div className="space-y-4">
      <div className="space-y-3 rounded-lg border border-border/70 p-3">
        <div className="flex flex-wrap gap-2" data-testid="curriculum-form-tabs">
          <button
            type="button"
            data-testid="curriculum-tab-board"
            onClick={() => setActiveFormTab("board")}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
              activeFormTab === "board"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:border-primary/40"
            }`}
          >
            Add Board
          </button>
          <button
            type="button"
            data-testid="curriculum-tab-class"
            onClick={() => setActiveFormTab("class")}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
              activeFormTab === "class"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:border-primary/40"
            }`}
          >
            Add Class
          </button>
          <button
            type="button"
            data-testid="curriculum-tab-subject"
            onClick={() => setActiveFormTab("subject")}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
              activeFormTab === "subject"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:border-primary/40"
            }`}
          >
            Add Subject
          </button>
          <button
            type="button"
            data-testid="curriculum-tab-chapter"
            onClick={() => setActiveFormTab("chapter")}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
              activeFormTab === "chapter"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:border-primary/40"
            }`}
          >
            Add Chapter
          </button>
          <button
            type="button"
            data-testid="curriculum-tab-exercise"
            onClick={() => setActiveFormTab("exercise")}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
              activeFormTab === "exercise"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:border-primary/40"
            }`}
          >
            Add Exercise
          </button>
        </div>

        {activeFormTab === "board" ? (
          <form className="space-y-2" data-testid="curriculum-board-form" onSubmit={submitBoard}>
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
        ) : null}

        {activeFormTab === "class" ? (
          <form className="space-y-2" data-testid="curriculum-class-form" onSubmit={submitClass}>
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
        ) : null}

        {activeFormTab === "subject" ? (
          <form className="space-y-2" data-testid="curriculum-subject-form" onSubmit={submitSubject}>
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
            <Button data-testid="curriculum-subject-submit" type="submit" size="sm" variant="secondary" disabled={isSubmitting}>
              Add subject
            </Button>
          </form>
        ) : null}

        {activeFormTab === "chapter" ? (
          <div className="space-y-4">
            <form className="space-y-2" data-testid="curriculum-chapter-form" onSubmit={submitChapter}>
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
              <Textarea
                data-testid="curriculum-chapter-summary-input"
                value={chapterSummary}
                onChange={(event) => setChapterSummary(event.target.value)}
                className="min-h-48 resize-y"
                placeholder="Write chapter summary in Markdown. Example: ![Diagram](https://...) and $$E=mc^2$$"
              />
              <p className="text-xs text-muted-foreground">Supports Markdown, images, and math notation.</p>
              <div
                className="rounded-lg border border-border/60 bg-background/50 p-3"
                data-testid="curriculum-chapter-summary-preview"
              >
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Summary preview</p>
                {chapterSummary.trim().length > 0 ? (
                  <MarkdownMathRenderer content={chapterSummary} className="prose-sm" />
                ) : (
                  <p className="text-sm text-muted-foreground">Preview appears here as rendered Markdown.</p>
                )}
              </div>
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

            <div className="space-y-3 rounded-lg border border-border/60 bg-background/50 p-3">
              <p className="text-sm font-semibold text-foreground">Edit Existing Chapter Summary</p>
              <Select
                data-testid="curriculum-summary-editor-chapter-select"
                value={summaryEditorChapterId}
                onChange={(event) => setSummaryEditorChapterId(event.target.value)}
              >
                <option value="">Select chapter</option>
                {chapterOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </Select>

              <Textarea
                ref={summaryEditorInputRef}
                data-testid="curriculum-summary-editor-input"
                value={summaryEditorContent}
                onChange={(event) => setSummaryEditorContent(event.target.value)}
                className="min-h-56 resize-y"
                placeholder="Summary markdown for the selected chapter."
                disabled={!summaryEditorChapterId || isSummaryLoading || isSummaryMediaUploading}
              />

              <div className="grid gap-2 md:grid-cols-2">
                <Input
                  data-testid="curriculum-summary-editor-alt-input"
                  value={summaryEditorImageAlt}
                  onChange={(event) => setSummaryEditorImageAlt(event.target.value)}
                  placeholder="Image alt text"
                  disabled={!summaryEditorChapterId}
                />
                <Input
                  ref={summaryEditorUploadInputRef}
                  data-testid="curriculum-summary-editor-upload-input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  disabled={!summaryEditorChapterId || isSummaryMediaUploading}
                />
                <Input
                  data-testid="curriculum-summary-editor-width-input"
                  type="number"
                  min={1}
                  value={summaryEditorImageWidth}
                  onChange={(event) => setSummaryEditorImageWidth(event.target.value)}
                  placeholder="Width (px)"
                  disabled={!summaryEditorChapterId}
                />
                <Input
                  data-testid="curriculum-summary-editor-height-input"
                  type="number"
                  min={1}
                  value={summaryEditorImageHeight}
                  onChange={(event) => setSummaryEditorImageHeight(event.target.value)}
                  placeholder="Height (px, optional)"
                  disabled={!summaryEditorChapterId}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  data-testid="curriculum-summary-editor-upload-button"
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={uploadSummaryFigure}
                  disabled={!summaryEditorChapterId || isSummaryMediaUploading}
                >
                  {isSummaryMediaUploading ? "Uploading..." : "Upload figure"}
                </Button>
                <Button
                  data-testid="curriculum-summary-editor-save-button"
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={saveSummaryEditor}
                  disabled={!summaryEditorChapterId || isSummarySaving || isSummaryLoading}
                >
                  {isSummarySaving ? "Saving..." : "Save summary"}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Uploaded image markdown is inserted at cursor position. Width/height are emitted as image title metadata
                (`"width=640 height=320"`).
              </p>

              <div
                className="rounded-lg border border-border/60 bg-background p-3"
                data-testid="curriculum-summary-editor-preview"
              >
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Editor preview</p>
                {summaryEditorContent.trim().length > 0 ? (
                  <MarkdownMathRenderer content={summaryEditorContent} className="prose-sm" />
                ) : (
                  <p className="text-sm text-muted-foreground">Select a chapter to load and preview summary markdown.</p>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {activeFormTab === "exercise" ? (
          <form className="space-y-2" data-testid="curriculum-exercise-form" onSubmit={submitExercise}>
            <p className="text-sm font-semibold text-foreground">Add Exercise</p>
            <Select
              data-testid="curriculum-exercise-chapter-select"
              value={exerciseChapterId}
              onChange={(event) => setExerciseChapterId(event.target.value)}
            >
              <option value="">Select chapter</option>
              {chapterOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Select
              data-testid="curriculum-exercise-type-select"
              value={exerciseType}
              onChange={(event) => setExerciseType(event.target.value as ExerciseType)}
            >
              {exerciseTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Select
              data-testid="curriculum-exercise-difficulty-select"
              value={exerciseDifficulty}
              onChange={(event) => setExerciseDifficulty(event.target.value as "easy" | "medium" | "hard")}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </Select>
            <Input
              data-testid="curriculum-exercise-number-input"
              value={exerciseNumber}
              onChange={(event) => setExerciseNumber(event.target.value)}
              placeholder="Exercise number (e.g. Q1)"
            />
            <Textarea
              data-testid="curriculum-exercise-question-input"
              value={exerciseQuestion}
              onChange={(event) => setExerciseQuestion(event.target.value)}
              className="min-h-28 resize-y"
              placeholder="Exercise question"
            />
            <Textarea
              data-testid="curriculum-exercise-solution-input"
              value={exerciseSolution}
              onChange={(event) => setExerciseSolution(event.target.value)}
              className="min-h-32 resize-y"
              placeholder="Step-by-step solution (Markdown and math supported)"
            />
            <p className="text-xs text-muted-foreground">Numerical problems are available for Physics chapters.</p>
            <Button data-testid="curriculum-exercise-submit" type="submit" size="sm" variant="secondary" disabled={isSubmitting}>
              Add exercise
            </Button>
          </form>
        ) : null}
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
              <button
                type="button"
                className="flex w-full items-center gap-2 text-left"
                aria-label={`Toggle ${board.name}`}
                onClick={() => toggleBoard(board.id)}
              >
                <span className="text-muted-foreground">{expandedBoardIds.has(board.id) ? "-" : "+"}</span>
                <span className="font-semibold text-foreground">{board.name}</span>
              </button>

              {expandedBoardIds.has(board.id) ? (
                <div className="mt-2 space-y-2 pl-6">
                  {board.classes.length === 0 ? <p className="text-muted-foreground">No classes</p> : null}
                  {board.classes.map((boardClass) => (
                    <div key={boardClass.id} className="space-y-1">
                      <p className="font-medium text-foreground/90">- {boardClass.name}</p>
                      {boardClass.subjects.length === 0 ? (
                        <p className="pl-4 text-muted-foreground">No subjects</p>
                      ) : (
                        <ul className="space-y-1 pl-4 text-foreground/80">
                          {boardClass.subjects.map((subject) => (
                            <li key={subject.id}>
                              - {subject.name} ({subject.chapters.length} chapter{subject.chapters.length === 1 ? "" : "s"})
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
    </div>
  );
}

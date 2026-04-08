"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  AdminBreadcrumb,
  AdminPageHeader,
  AdminFormCard,
  AdminFormField,
  AdminActionButton,
} from "@/components/admin";
import { StickyBreadcrumbWrapper } from "@/components/common/sticky-breadcrumb-wrapper";
import { Select } from "@/components/ui/select";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import {
  createAdminPastPaper,
  updateAdminPastPaper,
  type AdminCurriculumBoard,
  type PastPaperResponse,
} from "@/lib/admin-api";
import { useToast } from "@/components/ui/toast";

interface PastPaperFormProps {
  boards: AdminCurriculumBoard[];
  existingPaper?: PastPaperResponse;
}

export function PastPaperForm({ boards, existingPaper }: PastPaperFormProps) {
  const router = useRouter();
  const { pushToast } = useToast();
  const isEdit = !!existingPaper;

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
            label: `${board.name} / ${boardClass.name} / ${subject.name}`,
          });
        }
      }
    }
    return options;
  }, [boards]);

  // Form state
  const [title, setTitle] = useState(existingPaper?.title ?? "");
  const [boardId, setBoardId] = useState<string>(
    existingPaper?.boardId?.toString() ?? ""
  );
  const [grade, setGrade] = useState<string>(existingPaper?.grade ?? "");
  const [subjectId, setSubjectId] = useState<string>(
    existingPaper?.subjectId?.toString() ?? ""
  );
  const [year, setYear] = useState<string>(
    existingPaper?.year?.toString() ?? ""
  );
  const [paperContent, setPaperContent] = useState(
    existingPaper?.paperContent ?? ""
  );
  const [solutionContent, setSolutionContent] = useState(
    existingPaper?.solutionContent ?? ""
  );
  const [showPreview, setShowPreview] = useState(false);

  // Errors
  const [titleError, setTitleError] = useState("");
  const [boardError, setBoardError] = useState("");
  const [gradeError, setGradeError] = useState("");
  const [subjectError, setSubjectError] = useState("");
  const [yearError, setYearError] = useState("");
  const [paperContentError, setPaperContentError] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    let hasError = false;

    if (!title.trim()) {
      setTitleError("Title is required");
      hasError = true;
    } else {
      setTitleError("");
    }

    if (!boardId) {
      setBoardError("Board is required");
      hasError = true;
    } else {
      setBoardError("");
    }

    if (!grade) {
      setGradeError("Grade is required");
      hasError = true;
    } else {
      setGradeError("");
    }

    if (!subjectId) {
      setSubjectError("Subject is required");
      hasError = true;
    } else {
      setSubjectError("");
    }

    if (!year.trim()) {
      setYearError("Year is required");
      hasError = true;
    } else {
      const yearNum = parseInt(year, 10);
      if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2099) {
        setYearError("Year must be between 2000 and 2099");
        hasError = true;
      } else {
        setYearError("");
      }
    }

    if (!paperContent.trim()) {
      setPaperContentError("Paper content is required");
      hasError = true;
    } else {
      setPaperContentError("");
    }

    return !hasError;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      if (isEdit && existingPaper) {
        await updateAdminPastPaper({
          id: existingPaper.id,
          input: {
            title: title.trim(),
            boardId: parseInt(boardId, 10),
            grade: grade as "9" | "10",
            subjectId: parseInt(subjectId, 10),
            year: parseInt(year, 10),
            paperContent: paperContent.trim(),
            solutionContent: solutionContent.trim() || undefined,
          },
        });
        pushToast({
          title: "Past paper updated",
          description: `"${title.trim()}" has been updated successfully.`,
          tone: "success",
        });
      } else {
        await createAdminPastPaper({
          title: title.trim(),
          boardId: parseInt(boardId, 10),
          grade: grade as "9" | "10",
          subjectId: parseInt(subjectId, 10),
          year: parseInt(year, 10),
          paperContent: paperContent.trim(),
          solutionContent: solutionContent.trim() || undefined,
        });
        pushToast({
          title: "Past paper created",
          description: `"${title.trim()}" has been created successfully.`,
          tone: "success",
        });
      }
      router.push("/admin/content/past-papers");
    } catch (error) {
      pushToast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : `Failed to ${isEdit ? "update" : "create"} past paper`,
        tone: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <StickyBreadcrumbWrapper className="-mx-4 -mt-6 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <AdminBreadcrumb
          segments={[
            { label: "Admin", href: "/admin" },
            { label: "Content", href: "/admin/content" },
            { label: "Past Papers", href: "/admin/content/past-papers" },
            {
              label: isEdit
                ? `Edit "${existingPaper?.title}"`
                : "Add Past Paper",
            },
          ]}
        />
      </StickyBreadcrumbWrapper>

      <AdminPageHeader
        title={isEdit ? "Edit Past Paper" : "Add Past Paper"}
        subtitle={
          isEdit
            ? "Update the past paper details below"
            : "Create a new past paper with markdown content"
        }
      />

      <AdminFormCard>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <AdminFormField
            id="pp-title"
            label="Title"
            required
            error={titleError}
            hint='e.g., "Physics Paper 1 - May 2024"'
          >
            <input
              id="pp-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleError("");
              }}
              placeholder="e.g., Physics Paper 1 - May 2024"
              className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
          </AdminFormField>

          {/* Board */}
          <AdminFormField
            id="pp-board"
            label="Board"
            required
            error={boardError}
          >
            <Select
              id="pp-board"
              value={boardId}
              onChange={(e) => {
                setBoardId(e.target.value);
                setBoardError("");
              }}
              aria-invalid={!!boardError}
            >
              <option value="">Select a board</option>
              {boardOptions.map((opt) => (
                <option key={opt.id} value={opt.id.toString()}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </AdminFormField>

          {/* Grade */}
          <AdminFormField
            id="pp-grade"
            label="Grade"
            required
            error={gradeError}
          >
            <Select
              id="pp-grade"
              value={grade}
              onChange={(e) => {
                setGrade(e.target.value);
                setGradeError("");
              }}
              aria-invalid={!!gradeError}
            >
              <option value="">Select a grade</option>
              <option value="9">Class 9</option>
              <option value="10">Class 10</option>
            </Select>
          </AdminFormField>

          {/* Subject */}
          <AdminFormField
            id="pp-subject"
            label="Subject"
            required
            error={subjectError}
          >
            <Select
              id="pp-subject"
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value);
                setSubjectError("");
              }}
              aria-invalid={!!subjectError}
            >
              <option value="">Select a subject</option>
              {subjectOptions.map((opt) => (
                <option key={opt.id} value={opt.id.toString()}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </AdminFormField>

          {/* Year */}
          <AdminFormField
            id="pp-year"
            label="Year"
            required
            error={yearError}
            hint="The year the paper was administered, e.g., 2024"
          >
            <input
              id="pp-year"
              type="number"
              value={year}
              onChange={(e) => {
                setYear(e.target.value);
                setYearError("");
              }}
              placeholder="e.g., 2024"
              min={2000}
              max={2099}
              className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
          </AdminFormField>

          {/* Paper Content (markdown) */}
          <AdminFormField
            id="pp-paper-content"
            label="Paper Content (Markdown)"
            required
            error={paperContentError}
            hint="Write the past paper questions in Markdown format"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    !showPreview
                      ? "bg-[var(--primary)] text-white"
                      : "bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  Write
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    showPreview
                      ? "bg-[var(--primary)] text-white"
                      : "bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  Preview
                </button>
              </div>
              {showPreview ? (
                <div className="min-h-[200px] rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] p-4">
                  {paperContent.trim() ? (
                    <MarkdownRenderer
                      content={paperContent}
                      className="text-sm"
                    />
                  ) : (
                    <p className="text-sm text-[var(--text-secondary)] italic">
                      Nothing to preview yet. Write some content first.
                    </p>
                  )}
                </div>
              ) : (
                <textarea
                  id="pp-paper-content"
                  value={paperContent}
                  onChange={(e) => {
                    setPaperContent(e.target.value);
                    setPaperContentError("");
                  }}
                  placeholder="# Question 1&#10;&#10;Solve the following equation:&#10;&#10;$$x^2 + 5x + 6 = 0$$&#10;&#10;**[5 marks]**"
                  rows={12}
                  className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 font-mono text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                />
              )}
            </div>
          </AdminFormField>

          {/* Solution Content (markdown, optional) */}
          <AdminFormField
            id="pp-solution-content"
            label="Solution Content (Markdown)"
            hint="Optional. Write the solutions/marking scheme in Markdown format"
          >
            <textarea
              id="pp-solution-content"
              value={solutionContent}
              onChange={(e) => setSolutionContent(e.target.value)}
              placeholder="# Question 1 Solution&#10;&#10;Using the quadratic formula...&#10;&#10;$$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$"
              rows={8}
              className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 font-mono text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
          </AdminFormField>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <AdminActionButton
              variant="primary"
              type="submit"
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              {isEdit ? "Save Changes" : "Create Past Paper"}
            </AdminActionButton>
            <Link href="/admin/content/past-papers">
              <AdminActionButton variant="secondary" type="button">
                Cancel
              </AdminActionButton>
            </Link>
          </div>
        </form>
      </AdminFormCard>
    </div>
  );
}

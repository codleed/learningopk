"use client";

import { useState, useRef, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  AdminBreadcrumb,
  AdminPageHeader,
  AdminFormCard,
  AdminFormField,
  AdminActionButton,
} from "@/components/admin";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  createAdminCurriculumChapter,
  type AdminCurriculumBoard,
} from "@/lib/admin-api";
import { useToast } from "@/components/ui/toast";
import { MarkdownMathRenderer } from "@/components/learn/markdown-math-renderer";
import { CodeMirrorMarkdownEditor } from "@/components/admin/codemirror-markdown-editor";

const toSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

interface AddChapterFormProps {
  boards: AdminCurriculumBoard[];
}

interface SubjectOption {
  id: number;
  classId: number;
  boardName: string;
  className: string;
  subjectName: string;
  label: string;
}

export function AddChapterForm({ boards }: AddChapterFormProps) {
  const router = useRouter();
  const { pushToast } = useToast();
  const markdownInputRef = useRef<HTMLInputElement>(null);

  const subjectOptions: SubjectOption[] = boards.flatMap((board) =>
    board.classes.flatMap((boardClass) =>
      boardClass.subjects.map((subject) => ({
        id: subject.id,
        classId: boardClass.id,
        boardName: board.name,
        className: boardClass.name,
        subjectName: subject.name,
        label: `${board.name} / ${boardClass.name} / ${subject.name}`,
      }))
    )
  );

  const [subjectId, setSubjectId] = useState<string>("");
  const [chapterNumber, setChapterNumber] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [slug, setSlug] = useState<string>("");
  const [summary, setSummary] = useState<string>("");
  const [showPreview, setShowPreview] = useState<boolean>(false);

  const [subjectError, setSubjectError] = useState<string>("");
  const [chapterNumberError, setChapterNumberError] = useState<string>("");
  const [titleError, setTitleError] = useState<string>("");
  const [summaryError, setSummaryError] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubjectChange = (value: string) => {
    setSubjectId(value);
    if (subjectError) {
      setSubjectError("");
    }
  };

  const handleChapterNumberChange = (value: string) => {
    setChapterNumber(value);
    if (chapterNumberError) {
      setChapterNumberError("");
    }
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    setSlug(toSlug(value));
    if (titleError) {
      setTitleError("");
    }
  };

  const handleSummaryChange = (value: string) => {
    setSummary(value);
    if (summaryError) {
      setSummaryError("");
    }
  };

  const handleSubjectBlur = () => {
    if (!subjectId) {
      setSubjectError("Subject is required");
    } else {
      setSubjectError("");
    }
  };

  const handleChapterNumberBlur = () => {
    if (!chapterNumber) {
      setChapterNumberError("Chapter number is required");
    } else {
      const num = parseInt(chapterNumber, 10);
      if (isNaN(num) || num < 1 || num > 99) {
        setChapterNumberError("Chapter number must be between 1 and 99");
      } else {
        setChapterNumberError("");
      }
    }
  };

  const handleTitleBlur = () => {
    if (!title.trim()) {
      setTitleError("Chapter title is required");
    } else if (title.length > 200) {
      setTitleError("Chapter title must be 200 characters or less");
    } else {
      setTitleError("");
    }
  };

  const handleMarkdownFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    try {
      const importedMarkdown = await file.text();
      if (importedMarkdown.trim().length === 0) {
        pushToast({
          title: "Markdown file is empty",
          tone: "error"
        });
        return;
      }

      if (
        summary.trim().length > 0 &&
        !window.confirm("Importing a Markdown file will replace the current summary. Continue?")
      ) {
        return;
      }

      setSummary(importedMarkdown);
      pushToast({
        title: "Markdown imported successfully",
        tone: "success"
      });
    } catch {
      pushToast({
        title: "Could not read Markdown file",
        tone: "error"
      });
    } finally {
      input.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    let hasError = false;

    if (!subjectId) {
      setSubjectError("Subject is required");
      hasError = true;
    }

    if (!chapterNumber) {
      setChapterNumberError("Chapter number is required");
      hasError = true;
    } else {
      const num = parseInt(chapterNumber, 10);
      if (isNaN(num) || num < 1 || num > 99) {
        setChapterNumberError("Chapter number must be between 1 and 99");
        hasError = true;
      }
    }

    if (!title.trim()) {
      setTitleError("Chapter title is required");
      hasError = true;
    } else if (title.length > 200) {
      setTitleError("Chapter title must be 200 characters or less");
      hasError = true;
    }

    if (!summary.trim()) {
      setSummaryError("Summary is required");
      hasError = true;
    }

    if (hasError) {
      return;
    }

    setIsSubmitting(true);

    try {
      await createAdminCurriculumChapter({
        subjectId: parseInt(subjectId, 10),
        chapterNumber: parseInt(chapterNumber, 10),
        title: title.trim(),
        slug,
        summary: summary.trim(),
      });
      pushToast({
        title: "Chapter created",
        description: `"${title}" has been created successfully.`,
        tone: "success",
      });
      router.push("/admin/content");
    } catch (error) {
      pushToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create chapter",
        tone: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminBreadcrumb
        segments={[
          { label: "Admin", href: "/admin" },
          { label: "Content", href: "/admin/content" },
          { label: "Chapters", href: "/admin/content" },
          { label: "Add Chapter" },
        ]}
      />

      <AdminPageHeader
        title="Add Chapter"
        subtitle="Create a new chapter under a subject"
      />

      <AdminFormCard>
        <form onSubmit={handleSubmit} className="space-y-6">
          <AdminFormField
            id="chapter-subject"
            label="Subject"
            required
            error={subjectError}
          >
            <Select
              id="chapter-subject"
              value={subjectId}
              onChange={(e) => handleSubjectChange(e.target.value)}
              onBlur={handleSubjectBlur}
              aria-invalid={!!subjectError}
              aria-describedby={subjectError ? "chapter-subject-error" : undefined}
            >
              <option value="">Select a subject</option>
              {subjectOptions.map((option) => (
                <option key={option.id} value={option.id.toString()}>
                  {option.label}
                </option>
              ))}
            </Select>
          </AdminFormField>

          <AdminFormField
            id="chapter-number"
            label="Chapter Number"
            required
            error={chapterNumberError}
          >
            <input
              id="chapter-number"
              type="number"
              min="1"
              max="99"
              value={chapterNumber}
              onChange={(e) => handleChapterNumberChange(e.target.value)}
              onBlur={handleChapterNumberBlur}
              placeholder="1"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
              aria-invalid={!!chapterNumberError}
              aria-describedby={chapterNumberError ? "chapter-number-error" : undefined}
            />
          </AdminFormField>

          <AdminFormField
            id="chapter-title"
            label="Chapter Title"
            required
            error={titleError}
          >
            <input
              id="chapter-title"
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              onBlur={handleTitleBlur}
              placeholder="e.g., Introduction to Physics"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
              aria-invalid={!!titleError}
              aria-describedby={titleError ? "chapter-title-error" : undefined}
            />
          </AdminFormField>

          <AdminFormField id="chapter-slug" label="Slug">
            <input
              id="chapter-slug"
              type="text"
              value={slug}
              readOnly
              placeholder="auto-generated-from-title"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] cursor-not-allowed"
            />
          </AdminFormField>

          <AdminFormField
            id="chapter-summary"
            label="Summary"
            required
            error={summaryError}
            hint="Supports Markdown, images, and math notation."
          >
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent/50"
                >
                  {showPreview ? "Edit" : "Preview"}
                </button>
                <button
                  type="button"
                  onClick={() => markdownInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent/50"
                >
                  Upload .md file
                </button>
                <Input
                  ref={markdownInputRef}
                  type="file"
                  accept=".md,text/markdown,text/plain"
                  onChange={handleMarkdownFileUpload}
                  className="hidden"
                />
              </div>
              {showPreview ? (
                <div className="min-h-48 rounded-lg border border-[var(--border)] bg-card p-4">
                  {summary ? (
                    <MarkdownMathRenderer content={summary} />
                  ) : (
                    <p className="text-sm text-[var(--muted-foreground)]">No content to preview</p>
                  )}
                </div>
              ) : (
                <CodeMirrorMarkdownEditor
                  value={summary}
                  onChange={handleSummaryChange}
                  placeholderText="Write chapter summary in markdown..."
                  className="min-h-64"
                  testId="add-chapter-summary-editor"
                />
              )}
            </div>
          </AdminFormField>

          <div className="flex items-center gap-3 pt-2">
            <AdminActionButton
              variant="primary"
              type="submit"
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              Create Chapter
            </AdminActionButton>
            <Link href="/admin/content">
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

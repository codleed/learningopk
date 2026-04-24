"use client";

import { useState, useRef, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import {
  AdminBreadcrumb,
  AdminPageHeader,
  AdminFormCard,
  AdminFormField,
  AdminActionButton,
} from "@/components/admin";
import { StickyBreadcrumbWrapper } from "@/components/common/sticky-breadcrumb-wrapper";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  createAdminCurriculumChapter,
  uploadAdminChapterCoverImage,
  type AdminCurriculumBoard,
} from "@/lib/admin-api";
import { useToast } from "@/components/ui/toast";
import { MarkdownMathRenderer } from "@/components/learn/markdown-math-renderer";
import { CodeMirrorMarkdownEditor } from "@/components/admin/codemirror-markdown-editor";
import { X } from "lucide-react";

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
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);

  const [subjectError, setSubjectError] = useState<string>("");
  const [chapterNumberError, setChapterNumberError] = useState<string>("");
  const [titleError, setTitleError] = useState<string>("");
  const [summaryError, setSummaryError] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const coverImageInputRef = useRef<HTMLInputElement>(null);

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

  const handleCoverImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      pushToast({
        title: "Invalid file type",
        description: "Please upload a JPG, PNG, or WebP image.",
        tone: "error"
      });
      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      pushToast({
        title: "File too large",
        description: "Please upload an image smaller than 10MB.",
        tone: "error"
      });
      event.target.value = "";
      return;
    }

    setCoverImage(file);
    setCoverImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveCoverImage = () => {
    setCoverImage(null);
    if (coverImagePreview) {
      URL.revokeObjectURL(coverImagePreview);
    }
    setCoverImagePreview(null);
    if (coverImageInputRef.current) {
      coverImageInputRef.current.value = "";
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
      const result = await createAdminCurriculumChapter({
        subjectId: parseInt(subjectId, 10),
        chapterNumber: parseInt(chapterNumber, 10),
        title: title.trim(),
        slug,
      });

      if (coverImage && result.chapter?.id) {
        try {
          await uploadAdminChapterCoverImage({
            chapterId: result.chapter.id,
            file: coverImage
          });
        } catch {
          // Image upload failed, but chapter was created
        }
      }

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
      <StickyBreadcrumbWrapper className="-mx-4 -mt-6 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <AdminBreadcrumb
          segments={[
            { label: "Admin", href: "/admin" },
            { label: "Content", href: "/admin/content" },
            { label: "Chapters", href: "/admin/content" },
            { label: "Add Chapter" },
          ]}
        />
      </StickyBreadcrumbWrapper>

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
              className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
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
              className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
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
              className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] cursor-not-allowed"
            />
          </AdminFormField>

          <AdminFormField
            id="chapter-cover-image"
            label="Cover Image"
            hint="Optional, JPG/PNG/WebP, max 10MB"
          >
            <input
              ref={coverImageInputRef}
              type="file"
              id="chapter-cover-image"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleCoverImageChange}
              className="hidden"
            />
            {coverImagePreview ? (
              <div className="relative w-full max-w-[240px]">
                <div className="relative aspect-video overflow-hidden rounded-lg border border-[var(--border-default)]">
                  <Image
                    src={coverImagePreview}
                    alt="Cover image preview"
                    fill
                    className="object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCoverImage}
                  className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--bg-danger)] text-white shadow-md hover:bg-[var(--bg-danger-hover)]"
                  aria-label="Remove cover image"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <p className="mt-1.5 truncate text-xs text-[var(--text-secondary)]">
                  {coverImage?.name}
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => coverImageInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg border border-dashed border-[var(--border-default)] bg-[var(--bg-subtle)] px-4 py-3 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface)]"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                </svg>
                Upload cover image
              </button>
            )}
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
                  className="inline-flex items-center gap-1.5 rounded-md border border-border-default bg-bg-surface px-3 py-1.5 text-xs font-medium text-text-primary transition hover:bg-bg-subtle/50"
                >
                  {showPreview ? "Edit" : "Preview"}
                </button>
                <button
                  type="button"
                  onClick={() => markdownInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border-default bg-bg-surface px-3 py-1.5 text-xs font-medium text-text-primary transition hover:bg-bg-subtle/50"
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
                <div className="min-h-48 rounded-lg border border-[var(--border-default)] bg-bg-surface p-4">
                  {summary ? (
                    <MarkdownMathRenderer content={summary} />
                  ) : (
                    <p className="text-sm text-[var(--text-secondary)]">No content to preview</p>
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

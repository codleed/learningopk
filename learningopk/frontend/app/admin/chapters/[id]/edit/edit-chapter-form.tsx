"use client";

import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";

import {
  AdminBreadcrumb,
  AdminPageHeader,
  AdminFormCard,
  AdminFormField,
  AdminActionButton,
} from "@/components/admin";
import { StickyBreadcrumbWrapper } from "@/components/common/sticky-breadcrumb-wrapper";
import { Input } from "@/components/ui/input";
import {
  updateAdminCurriculumChapter,
  updateAdminChapterSummary,
  deleteAdminCurriculumChapter,
} from "@/lib/admin-api";
import { useToast } from "@/components/ui/toast";
import { CodeMirrorMarkdownEditor } from "@/components/admin/codemirror-markdown-editor";
import { MarkdownMathRenderer } from "@/components/learn/markdown-math-renderer";

const toSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

interface EditChapterFormProps {
  chapter: {
    id: number;
    chapterNumber: number;
    title: string;
    slug: string;
    subjectName: string;
    className: string;
    boardName: string;
  };
  initialSummary: string;
}

type TabType = "metadata" | "summary";

export function EditChapterForm({ chapter, initialSummary }: EditChapterFormProps) {
  const router = useRouter();
  const { pushToast } = useToast();
  const markdownInputRef = useRef<HTMLInputElement>(null);

  const [chapterNumber, setChapterNumber] = useState<string>(String(chapter.chapterNumber));
  const [title, setTitle] = useState<string>(chapter.title);
  const [slug, setSlug] = useState<string>(chapter.slug);

  const [summary, setSummary] = useState<string>(initialSummary);
  const [showPreview, setShowPreview] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<TabType>("metadata");

  const [chapterNumberError, setChapterNumberError] = useState<string>("");
  const [titleError, setTitleError] = useState<string>("");
  const [summaryError, setSummaryError] = useState<string>("");

  const [isSavingMetadata, setIsSavingMetadata] = useState(false);
  const [isSavingSummary, setIsSavingSummary] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Update slug when title changes
  useEffect(() => {
    setSlug(toSlug(title));
  }, [title]);

  const handleChapterNumberChange = (value: string) => {
    setChapterNumber(value);
    if (chapterNumberError) {
      setChapterNumberError("");
    }
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
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

  const handleSaveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    let hasError = false;

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

    if (hasError) {
      return;
    }

    setIsSavingMetadata(true);

    try {
      await updateAdminCurriculumChapter({
        chapterId: chapter.id,
        chapterNumber: parseInt(chapterNumber, 10),
        title: title.trim(),
        slug,
      });
      pushToast({
        title: "Changes saved",
        description: "Chapter metadata has been updated successfully.",
        tone: "success",
      });
    } catch (error) {
      pushToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update chapter",
        tone: "error",
      });
    } finally {
      setIsSavingMetadata(false);
    }
  };

  const handleSaveSummary = async () => {
    if (!summary.trim()) {
      setSummaryError("Summary is required");
      return;
    }

    setIsSavingSummary(true);

    try {
      await updateAdminChapterSummary({
        chapterId: chapter.id,
        summary: summary.trim(),
      });
      pushToast({
        title: "Summary saved",
        description: "Chapter summary has been updated successfully.",
        tone: "success",
      });
    } catch (error) {
      pushToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update summary",
        tone: "error",
      });
    } finally {
      setIsSavingSummary(false);
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

  const handleDelete = async () => {
    const confirmed = window.confirm("Delete this chapter and all related exercises?");
    if (!confirmed) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteAdminCurriculumChapter(chapter.id);
      pushToast({
        title: "Chapter deleted",
        description: "The chapter has been deleted successfully.",
        tone: "success",
      });
      router.push("/admin/content");
    } catch (error) {
      pushToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete chapter",
        tone: "error",
      });
      setIsDeleting(false);
    }
  };

  const breadcrumbSubject = chapter.subjectName
    ? `${chapter.boardName} / ${chapter.className} / ${chapter.subjectName}`
    : chapter.title;

  return (
    <div className="space-y-6">
      <StickyBreadcrumbWrapper className="-mx-4 -mt-6 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <AdminBreadcrumb
          segments={[
            { label: "Admin", href: "/admin" },
            { label: "Content", href: "/admin/content" },
            { label: "Chapters", href: "/admin/content" },
            { label: chapter.subjectName || chapter.title },
            { label: "Edit" },
          ]}
        />
      </StickyBreadcrumbWrapper>

      <AdminPageHeader
        title="Edit Chapter"
        subtitle={chapter.title}
      />

      {/* Tab buttons */}
      <div className="flex items-center gap-1 border-b border-[var(--border-default)]">
        <button
          type="button"
          onClick={() => setActiveTab("metadata")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "metadata"
              ? "border-b-2 border-[var(--primary)] text-[var(--text-primary)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          Metadata
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("summary")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "summary"
              ? "border-b-2 border-[var(--primary)] text-[var(--text-primary)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          Summary Editor
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "metadata" && (
        <AdminFormCard>
          <form onSubmit={handleSaveMetadata} className="space-y-6">
            <AdminFormField
              id="chapter-subject"
              label="Subject"
            >
              <input
                id="chapter-subject"
                type="text"
                value={breadcrumbSubject}
                readOnly
                className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 py-2 text-sm text-[var(--text-primary)] cursor-not-allowed"
              />
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

            <div className="flex items-center gap-3 pt-2">
              <AdminActionButton
                variant="primary"
                type="submit"
                loading={isSavingMetadata}
                disabled={isSavingMetadata}
              >
                Save Changes
              </AdminActionButton>
            </div>
          </form>
        </AdminFormCard>
      )}

      {activeTab === "summary" && (
        <AdminFormCard>
          <div className="space-y-6">
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
                <div>
                  <CodeMirrorMarkdownEditor
                    value={summary}
                    onChange={handleSummaryChange}
                    placeholderText="Write chapter summary in markdown..."
                    className="min-h-64"
                  />
                </div>
              )}
            </div>

            <AdminActionButton
              variant="primary"
              onClick={handleSaveSummary}
              loading={isSavingSummary}
              disabled={isSavingSummary}
            >
              Save Summary
            </AdminActionButton>
          </div>
        </AdminFormCard>
      )}

      {/* Delete button */}
      <div className="pt-4 border-t border-[var(--border-default)]">
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 px-4 py-2 text-sm font-medium text-[var(--destructive)] transition hover:bg-[var(--destructive)]/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isDeleting ? "Deleting..." : "Delete Chapter"}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  AdminBreadcrumb,
  AdminPageHeader,
  AdminFormCard,
  AdminFormField,
  AdminActionButton,
} from "@/components/admin";
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

  // Metadata state
  const [chapterNumber, setChapterNumber] = useState<string>(String(chapter.chapterNumber));
  const [title, setTitle] = useState<string>(chapter.title);
  const [slug, setSlug] = useState<string>(chapter.slug);

  // Summary state
  const [summary, setSummary] = useState<string>(initialSummary);
  const [showPreview, setShowPreview] = useState<boolean>(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>("metadata");

  // Errors
  const [chapterNumberError, setChapterNumberError] = useState<string>("");
  const [titleError, setTitleError] = useState<string>("");
  const [summaryError, setSummaryError] = useState<string>("");

  // Loading states
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
    // Validate
    if (!summary.trim()) {
      setSummaryError("Summary is required");
      return;
    } else if (summary.length > 10000) {
      setSummaryError("Summary must be 10000 characters or less");
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
      <AdminBreadcrumb
        segments={[
          { label: "Admin", href: "/admin" },
          { label: "Content", href: "/admin/content" },
          { label: "Chapters", href: "/admin/content" },
          { label: chapter.subjectName || chapter.title },
          { label: "Edit" },
        ]}
      />

      <AdminPageHeader
        title="Edit Chapter"
        subtitle={chapter.title}
      />

      {/* Tab buttons */}
      <div className="flex items-center gap-1 border-b border-[var(--border)]">
        <button
          type="button"
          onClick={() => setActiveTab("metadata")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "metadata"
              ? "border-b-2 border-[var(--primary)] text-[var(--foreground)]"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          Metadata
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("summary")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "summary"
              ? "border-b-2 border-[var(--primary)] text-[var(--foreground)]"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
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
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm text-[var(--foreground)] cursor-not-allowed"
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
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent/50"
                >
                  {showPreview ? "Edit" : "Preview"}
                </button>
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
      <div className="pt-4 border-t border-[var(--border)]">
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

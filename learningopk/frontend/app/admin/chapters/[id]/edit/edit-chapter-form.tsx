"use client";

import { useState, useRef, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ImagePlus, Trash2, Settings } from "lucide-react";

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
  deleteAdminCurriculumChapter,
  uploadAdminChapterCoverImage,
  deleteAdminChapterCoverImage,
} from "@/lib/admin-api";
import { useToast } from "@/components/ui/toast";

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
    coverImageUrl: string | null;
  };
}

export function EditChapterForm({ chapter }: EditChapterFormProps) {
  const router = useRouter();
  const { pushToast } = useToast();
  const coverImageInputRef = useRef<HTMLInputElement>(null);

  const [chapterNumber, setChapterNumber] = useState<string>(String(chapter.chapterNumber));
  const [title, setTitle] = useState<string>(chapter.title);
  const [slug, setSlug] = useState<string>(chapter.slug);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(chapter.coverImageUrl);

  const [chapterNumberError, setChapterNumberError] = useState<string>("");
  const [titleError, setTitleError] = useState<string>("");

  const [isSavingMetadata, setIsSavingMetadata] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isDeletingCover, setIsDeletingCover] = useState(false);

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

  const handleCoverImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    setIsUploadingCover(true);

    try {
      const result = await uploadAdminChapterCoverImage({
        chapterId: chapter.id,
        file,
      });
      setCoverImageUrl(result.coverImageUrl);
      pushToast({
        title: "Cover image uploaded",
        description: "The chapter cover image has been updated.",
        tone: "success",
      });
    } catch (error) {
      pushToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload cover image",
        tone: "error",
      });
    } finally {
      setIsUploadingCover(false);
      input.value = "";
    }
  };

  const handleRemoveCoverImage = async () => {
    if (!coverImageUrl) return;

    const confirmed = window.confirm("Remove the cover image for this chapter?");
    if (!confirmed) return;

    setIsDeletingCover(true);

    try {
      await deleteAdminChapterCoverImage({ chapterId: chapter.id });
      setCoverImageUrl(null);
      pushToast({
        title: "Cover image removed",
        description: "The chapter cover image has been removed.",
        tone: "success",
      });
    } catch (error) {
      pushToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove cover image",
        tone: "error",
      });
    } finally {
      setIsDeletingCover(false);
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
        actions={
          <Link
            href={`/admin/content/chapters/${chapter.id}/manage`}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-subtle)]"
          >
            <Settings className="h-3.5 w-3.5" />
            Manage Content
          </Link>
        }
      />

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

          <AdminFormField id="chapter-cover-image" label="Cover Image">
            <div className="space-y-3">
              {coverImageUrl ? (
                <div className="relative group/cover w-full max-w-xs">
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-[var(--border-default)]">
                    <Image
                      src={coverImageUrl}
                      alt="Chapter cover preview"
                      fill
                      sizes="320px"
                      className="object-cover"
                    />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => coverImageInputRef.current?.click()}
                      disabled={isUploadingCover}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border-default bg-bg-surface px-3 py-1.5 text-xs font-medium text-text-primary transition hover:bg-bg-subtle/50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ImagePlus className="h-3.5 w-3.5" aria-hidden />
                      {isUploadingCover ? "Uploading..." : "Replace"}
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveCoverImage}
                      disabled={isDeletingCover}
                      className="inline-flex items-center gap-1.5 rounded-md border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 px-3 py-1.5 text-xs font-medium text-[var(--destructive)] transition hover:bg-[var(--destructive)]/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      {isDeletingCover ? "Removing..." : "Remove"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => coverImageInputRef.current?.click()}
                  disabled={isUploadingCover}
                  className="flex w-full max-w-xs flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--border-default)] bg-[var(--bg-base)] p-8 text-center transition hover:border-[var(--primary)]/50 hover:bg-[var(--bg-subtle)]/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ImagePlus className="h-8 w-8 text-[var(--text-secondary)]" aria-hidden />
                  <span className="text-sm font-medium text-[var(--text-secondary)]">
                    {isUploadingCover ? "Uploading..." : "Click to upload cover image"}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    JPG, PNG, WebP or GIF — max 10 MB
                  </span>
                </button>
              )}
              <Input
                ref={coverImageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleCoverImageUpload}
                className="hidden"
              />
            </div>
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

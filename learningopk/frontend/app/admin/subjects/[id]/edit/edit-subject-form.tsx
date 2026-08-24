"use client";

import { useState, useRef, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { X } from "lucide-react";

import {
  AdminBreadcrumb,
  AdminPageHeader,
  AdminFormCard,
  AdminFormField,
  AdminActionButton,
} from "@/components/admin";
import { StickyBreadcrumbWrapper } from "@/components/common/sticky-breadcrumb-wrapper";
import { Textarea } from "@/components/ui/textarea";
import {
  updateAdminCurriculumSubject,
  deleteAdminCurriculumSubject,
  uploadAdminSubjectCoverImage,
  deleteAdminSubjectCoverImage,
} from "@/lib/admin-api";
import { useToast } from "@/components/ui/toast";

interface EditSubjectFormProps {
  subject: {
    id: number;
    name: string;
    slug: string;
    icon: string | null;
    description: string | null;
    coverImageUrl: string | null;
    className: string;
    boardName: string;
  };
}

export function EditSubjectForm({ subject }: EditSubjectFormProps) {
  const router = useRouter();
  const { pushToast } = useToast();
  const coverImageInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(subject.name);
  const [slug, setSlug] = useState(subject.slug);
  const [icon, setIcon] = useState<string | null>(subject.icon);
  const [description, setDescription] = useState(subject.description ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(subject.coverImageUrl);

  const [nameError, setNameError] = useState("");
  const [descriptionError, setDescriptionError] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isDeletingCover, setIsDeletingCover] = useState(false);

  const handleNameChange = (value: string) => {
    setName(value);
    // For edit, we keep the original slug - don't auto-update
    if (nameError) {
      setNameError("");
    }
  };

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    if (descriptionError) {
      setDescriptionError("");
    }
  };

  const handleNameBlur = () => {
    if (!name.trim()) {
      setNameError("Subject name is required");
    } else if (name.length > 100) {
      setNameError("Subject name must be 100 characters or less");
    } else {
      setNameError("");
    }
  };

  const handleDescriptionBlur = () => {
    if (description.length > 500) {
      setDescriptionError("Description must be 500 characters or less");
    } else {
      setDescriptionError("");
    }
  };

  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate
    if (!name.trim()) {
      setNameError("Subject name is required");
      return;
    }
    if (name.length > 100) {
      setNameError("Subject name must be 100 characters or less");
      return;
    }
    if (description.length > 500) {
      setDescriptionError("Description must be 500 characters or less");
      return;
    }

    // Prevent save if media operations are in progress
    if (isUploadingCover || isDeletingCover) {
      pushToast({
        title: "Please wait",
        description: "Cover image operation is in progress. Please wait for it to complete.",
        tone: "warning",
      });
      return;
    }

    setIsSaving(true);

    try {
      await updateAdminCurriculumSubject({
        subjectId: subject.id,
        name: name.trim(),
        slug: subject.slug, // Keep original slug
        icon,
        description: description.trim() || null,
        coverImageUrl,
      });
      pushToast({
        title: "Subject updated",
        description: `"${name}" has been updated successfully.`,
        tone: "success",
      });
      router.push("/admin/content");
    } catch (error) {
      pushToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update subject",
        tone: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Delete this subject and all related chapters, exercises, and quizzes?"
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteAdminCurriculumSubject(subject.id);
      pushToast({
        title: "Subject deleted",
        description: `"${subject.name}" has been deleted.`,
        tone: "success",
      });
      router.push("/admin/content");
    } catch (error) {
      pushToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete subject",
        tone: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCoverImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      pushToast({
        title: "Invalid file type",
        description: "Please upload a JPG, PNG, or WebP image.",
        tone: "error",
      });
      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      pushToast({
        title: "File too large",
        description: "Please upload an image smaller than 10MB.",
        tone: "error",
      });
      event.target.value = "";
      return;
    }

    setIsUploadingCover(true);

    try {
      const result = await uploadAdminSubjectCoverImage({
        subjectId: subject.id,
        file,
      });
      setCoverImageUrl(result.coverImageUrl);
      pushToast({
        title: "Cover image uploaded",
        description: "The subject cover image has been updated.",
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

    const confirmed = window.confirm("Remove the cover image for this subject?");
    if (!confirmed) return;

    setIsDeletingCover(true);

    try {
      await deleteAdminSubjectCoverImage({ subjectId: subject.id });
      setCoverImageUrl(null);
      pushToast({
        title: "Cover image removed",
        description: "The subject cover image has been removed.",
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

  return (
    <div className="space-y-6">
      <StickyBreadcrumbWrapper className="-mx-4 -mt-6 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <AdminBreadcrumb
          segments={[
            { label: "Admin", href: "/admin" },
            { label: "Content", href: "/admin/content" },
            { label: "Subjects", href: "/admin/content" },
            { label: subject.name },
            { label: "Edit" },
          ]}
        />
      </StickyBreadcrumbWrapper>

      <AdminPageHeader title="Edit Subject" subtitle={`Editing "${subject.name}"`} />

      <AdminFormCard>
        <form onSubmit={handleSave} className="space-y-6">
          <AdminFormField id="subject-board" label="Board">
            <input
              id="subject-board"
              type="text"
              value={subject.boardName}
              readOnly
              className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 py-2 text-sm text-[var(--text-primary)] cursor-not-allowed"
            />
          </AdminFormField>

          <AdminFormField id="subject-class" label="Class">
            <input
              id="subject-class"
              type="text"
              value={subject.className}
              readOnly
              className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 py-2 text-sm text-[var(--text-primary)] cursor-not-allowed"
            />
          </AdminFormField>

          <AdminFormField id="subject-name" label="Subject Name" required error={nameError}>
            <input
              id="subject-name"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              onBlur={handleNameBlur}
              placeholder="e.g., Physics"
              className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
              aria-invalid={!!nameError}
              aria-describedby={nameError ? "subject-name-error" : undefined}
            />
          </AdminFormField>

          <AdminFormField id="subject-slug" label="Slug">
            <input
              id="subject-slug"
              type="text"
              value={slug}
              readOnly
              className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 py-2 text-sm text-[var(--text-primary)] cursor-not-allowed"
            />
          </AdminFormField>

          <AdminFormField
            id="subject-description"
            label="Description"
            error={descriptionError}
            hint="Optional, max 500 characters"
          >
            <Textarea
              id="subject-description"
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              onBlur={handleDescriptionBlur}
              placeholder="Brief description of the subject"
              rows={3}
              aria-invalid={!!descriptionError}
              aria-describedby={descriptionError ? "subject-description-error" : undefined}
            />
          </AdminFormField>

          <AdminFormField
            id="subject-cover-image"
            label="Cover Image"
            hint="Optional, JPG/PNG/WebP, max 10MB"
          >
            <input
              ref={coverImageInputRef}
              type="file"
              id="subject-cover-image"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleCoverImageUpload}
              className="hidden"
              disabled={isUploadingCover || isDeletingCover}
            />
            {coverImageUrl ? (
              <div className="space-y-3">
                <div className="relative w-full max-w-[240px]">
                  <div className="relative aspect-video overflow-hidden rounded-lg border border-[var(--border-default)]">
                    <Image
                      src={coverImageUrl}
                      alt="Cover image"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => coverImageInputRef.current?.click()}
                      disabled={isUploadingCover || isDeletingCover}
                      className="rounded-md border border-border-default bg-bg-surface px-3 py-1.5 text-xs font-medium text-text-primary transition hover:bg-bg-subtle/50 disabled:opacity-50"
                    >
                      {isUploadingCover ? "Uploading..." : "Replace"}
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveCoverImage}
                      disabled={isUploadingCover || isDeletingCover}
                      className="rounded-md border border-border-default bg-bg-surface px-3 py-1.5 text-xs font-medium text-[var(--text-danger)] transition hover:bg-bg-subtle/50 disabled:opacity-50"
                    >
                      {isDeletingCover ? "Removing..." : "Remove"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => coverImageInputRef.current?.click()}
                disabled={isUploadingCover || isDeletingCover}
                className="inline-flex items-center gap-2 rounded-lg border border-dashed border-[var(--border-default)] bg-[var(--bg-subtle)] px-4 py-3 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface)] disabled:opacity-50"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                  />
                </svg>
                {isUploadingCover ? "Uploading..." : "Upload cover image"}
              </button>
            )}
          </AdminFormField>

          <div className="flex items-center gap-3 pt-2">
            <AdminActionButton
              variant="primary"
              type="submit"
              loading={isSaving}
              disabled={isSaving || isDeleting || isUploadingCover || isDeletingCover}
            >
              Save Changes
            </AdminActionButton>
            <AdminActionButton
              variant="danger"
              type="button"
              onClick={handleDelete}
              loading={isDeleting}
              disabled={isSaving || isDeleting}
            >
              Delete Subject
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

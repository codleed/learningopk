"use client";

import { useState, useRef, useEffect, type ChangeEvent, type FormEvent } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  createAdminCurriculumSubject,
  uploadAdminSubjectCoverImage,
  type AdminCurriculumBoard,
} from "@/lib/admin-api";
import { useToast } from "@/components/ui/toast";
import { X } from "lucide-react";

const toSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

interface AddSubjectFormProps {
  boards: AdminCurriculumBoard[];
}

interface ClassOption {
  id: number;
  boardId: number;
  boardName: string;
  className: string;
  label: string;
}

export function AddSubjectForm({ boards }: AddSubjectFormProps) {
  const router = useRouter();
  const { pushToast } = useToast();

  // Flatten boards > classes for class options
  const classOptions: ClassOption[] = boards.flatMap((board) =>
    board.classes.map((boardClass) => ({
      id: boardClass.id,
      boardId: board.id,
      boardName: board.name,
      className: boardClass.name,
      label: `${board.name} / ${boardClass.name}`,
    }))
  );

  const [boardClassId, setBoardClassId] = useState<string>("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [boardClassError, setBoardClassError] = useState("");
  const [nameError, setNameError] = useState("");
  const [descriptionError, setDescriptionError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const coverImageInputRef = useRef<HTMLInputElement>(null);

  const handleNameChange = (value: string) => {
    setName(value);
    setSlug(toSlug(value));
    // Clear error when user starts typing
    if (nameError) {
      setNameError("");
    }
  };

  const handleBoardClassChange = (value: string) => {
    setBoardClassId(value);
    // Clear error when user selects
    if (boardClassError) {
      setBoardClassError("");
    }
  };

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    // Clear error when user types
    if (descriptionError) {
      setDescriptionError("");
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

    // Revoke existing preview URL to avoid memory leak
    if (coverImagePreview) {
      URL.revokeObjectURL(coverImagePreview);
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

  const handleBoardClassBlur = () => {
    if (!boardClassId) {
      setBoardClassError("Class is required");
    } else {
      setBoardClassError("");
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

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (coverImagePreview) {
        URL.revokeObjectURL(coverImagePreview);
      }
    };
  }, [coverImagePreview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    if (!boardClassId) {
      setBoardClassError("Class is required");
      return;
    }
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

    setIsSubmitting(true);

    try {
      const result = await createAdminCurriculumSubject({
        boardClassId: parseInt(boardClassId, 10),
        name: name.trim(),
        slug,
        description: description.trim() || undefined,
      });

      if (coverImage && result.subject?.id) {
        try {
          await uploadAdminSubjectCoverImage({
            subjectId: result.subject.id,
            file: coverImage
          });
        } catch (uploadError) {
          // Image upload failed, but subject was created
          pushToast({
            title: "Subject created, but cover image upload failed",
            description: uploadError instanceof Error ? uploadError.message : "Failed to upload cover image",
            tone: "error",
          });
          setIsSubmitting(false);
          return;
        }
      }

      pushToast({
        title: "Subject created",
        description: `"${name}" has been created successfully.`,
        tone: "success",
      });
      router.push("/admin/content");
    } catch (error) {
      pushToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create subject",
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
            { label: "Subjects", href: "/admin/content" },
            { label: "Add Subject" },
          ]}
        />
      </StickyBreadcrumbWrapper>

      <AdminPageHeader
        title="Add Subject"
        subtitle="Create a new subject under a class"
      />

      <AdminFormCard>
        <form onSubmit={handleSubmit} className="space-y-6">
          <AdminFormField
            id="subject-class"
            label="Class"
            required
            error={boardClassError}
          >
            <Select
              id="subject-class"
              value={boardClassId}
              onChange={(e) => handleBoardClassChange(e.target.value)}
              onBlur={handleBoardClassBlur}
              aria-invalid={!!boardClassError}
              aria-describedby={boardClassError ? "subject-class-error" : undefined}
            >
              <option value="">Select a class</option>
              {classOptions.map((option) => (
                <option key={option.id} value={option.id.toString()}>
                  {option.label}
                </option>
              ))}
            </Select>
          </AdminFormField>

          <AdminFormField
            id="subject-name"
            label="Subject Name"
            required
            error={nameError}
          >
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
              placeholder="auto-generated-from-name"
              className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] cursor-not-allowed"
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

          <div className="flex items-center gap-3 pt-2">
            <AdminActionButton
              variant="primary"
              type="submit"
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              Create Subject
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

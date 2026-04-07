"use client";

import { useState } from "react";
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
import {
  updateAdminCurriculumBoard,
  deleteAdminCurriculumBoard,
  type AdminCurriculumBoard,
} from "@/lib/admin-api";
import { useToast } from "@/components/ui/toast";

const toSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

interface EditBoardFormProps {
  board: AdminCurriculumBoard;
}

export function EditBoardForm({ board }: EditBoardFormProps) {
  const router = useRouter();
  const { pushToast } = useToast();

  const [name, setName] = useState(board.name);
  const [slug, setSlug] = useState(board.slug);
  const [nameError, setNameError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleNameChange = (value: string) => {
    setName(value);
    // Only auto-update slug if it hasn't been manually edited
    // For edit, we keep the original slug readonly
  };

  const handleNameBlur = () => {
    if (!name.trim()) {
      setNameError("Board name is required");
    } else if (name.length > 100) {
      setNameError("Board name must be 100 characters or less");
    } else {
      setNameError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    if (!name.trim()) {
      setNameError("Board name is required");
      return;
    }
    if (name.length > 100) {
      setNameError("Board name must be 100 characters or less");
      return;
    }

    setIsSubmitting(true);

    try {
      await updateAdminCurriculumBoard({
        boardId: board.id,
        name: name.trim(),
        slug: board.slug, // Keep original slug
      });
      pushToast({
        title: "Board updated",
        description: `"${name}" has been updated successfully.`,
        tone: "success",
      });
      router.push("/admin/content");
    } catch (error) {
      pushToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update board",
        tone: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Delete this board and all related classes, subjects, chapters, and exercises?"
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteAdminCurriculumBoard(board.id);
      pushToast({
        title: "Board deleted",
        description: `"${board.name}" has been deleted.`,
        tone: "success",
      });
      router.push("/admin/content");
    } catch (error) {
      pushToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete board",
        tone: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <StickyBreadcrumbWrapper className="-mx-4 -mt-6 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <AdminBreadcrumb
          segments={[
            { label: "Admin", href: "/admin" },
            { label: "Content", href: "/admin/content" },
            { label: "Boards", href: "/admin/content" },
            { label: board.name },
            { label: "Edit" },
          ]}
        />
      </StickyBreadcrumbWrapper>

      <AdminPageHeader
        title="Edit Board"
        subtitle={`Editing "${board.name}"`}
      />

      <AdminFormCard>
        <form onSubmit={handleSubmit} className="space-y-6">
          <AdminFormField
            id="board-name"
            label="Board Name"
            required
            error={nameError}
          >
            <input
              id="board-name"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              onBlur={handleNameBlur}
              placeholder="e.g., Punjab Board"
              className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
              aria-invalid={!!nameError}
              aria-describedby={nameError ? "board-name-error" : undefined}
            />
          </AdminFormField>

          <AdminFormField id="board-slug" label="Slug">
            <input
              id="board-slug"
              type="text"
              value={slug}
              readOnly
              className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 py-2 text-sm text-[var(--text-primary)] cursor-not-allowed"
            />
          </AdminFormField>

          <div className="flex items-center gap-3 pt-2">
            <AdminActionButton
              variant="primary"
              type="submit"
              loading={isSubmitting}
              disabled={isSubmitting || isDeleting}
            >
              Save Changes
            </AdminActionButton>
            <AdminActionButton
              variant="danger"
              type="button"
              onClick={handleDelete}
              loading={isDeleting}
              disabled={isSubmitting || isDeleting}
            >
              Delete Board
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
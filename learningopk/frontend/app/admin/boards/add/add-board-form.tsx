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
import { createAdminCurriculumBoard } from "@/lib/admin-api";
import { useToast } from "@/components/ui/toast";

const toSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function AddBoardForm() {
  const router = useRouter();
  const { pushToast } = useToast();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [nameError, setNameError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNameChange = (value: string) => {
    setName(value);
    setSlug(toSlug(value));
    // Clear error when user starts typing
    if (nameError) {
      setNameError("");
    }
  };

  const handleNameBlur = () => {
    if (!name.trim()) {
      setNameError("Board name is required");
    } else if (name.length > 100) {
      setNameError("Board name must be 100 characters or less");
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
      await createAdminCurriculumBoard({ name: name.trim(), slug });
      pushToast({
        title: "Board created",
        description: `"${name}" has been created successfully.`,
        tone: "success",
      });
      router.push("/admin/content");
    } catch (error) {
      pushToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create board",
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
          { label: "Boards", href: "/admin/content" },
          { label: "Add Board" },
        ]}
      />

      <AdminPageHeader
        title="Add Board"
        subtitle="Create a new educational board"
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
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
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
              placeholder="auto-generated-from-name"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] cursor-not-allowed"
            />
          </AdminFormField>

          <div className="flex items-center gap-3 pt-2">
            <AdminActionButton
              variant="primary"
              type="submit"
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              Create Board
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
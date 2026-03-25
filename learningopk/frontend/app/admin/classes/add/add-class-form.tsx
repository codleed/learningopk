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
import { Select } from "@/components/ui/select";
import {
  createAdminCurriculumClass,
  type AdminCurriculumBoard,
} from "@/lib/admin-api";
import { useToast } from "@/components/ui/toast";

const toSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

interface AddClassFormProps {
  boards: AdminCurriculumBoard[];
}

export function AddClassForm({ boards }: AddClassFormProps) {
  const router = useRouter();
  const { pushToast } = useToast();

  const [boardId, setBoardId] = useState<string>("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [boardError, setBoardError] = useState("");
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

  const handleBoardChange = (value: string) => {
    setBoardId(value);
    // Clear error when user selects
    if (boardError) {
      setBoardError("");
    }
  };

  const handleNameBlur = () => {
    if (!name.trim()) {
      setNameError("Class name is required");
    } else if (name.length > 100) {
      setNameError("Class name must be 100 characters or less");
    } else {
      setNameError("");
    }
  };

  const handleBoardBlur = () => {
    if (!boardId) {
      setBoardError("Board is required");
    } else {
      setBoardError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    if (!boardId) {
      setBoardError("Board is required");
      return;
    }
    if (!name.trim()) {
      setNameError("Class name is required");
      return;
    }
    if (name.length > 100) {
      setNameError("Class name must be 100 characters or less");
      return;
    }

    setIsSubmitting(true);

    try {
      await createAdminCurriculumClass({
        boardId: parseInt(boardId, 10),
        name: name.trim(),
        slug,
      });
      pushToast({
        title: "Class created",
        description: `"${name}" has been created successfully.`,
        tone: "success",
      });
      router.push("/admin/content");
    } catch (error) {
      pushToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create class",
        tone: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const boardOptions = boards.map((b) => ({
    value: b.id.toString(),
    label: b.name,
  }));

  return (
    <div className="space-y-6">
      <AdminBreadcrumb
        segments={[
          { label: "Admin", href: "/admin" },
          { label: "Content", href: "/admin/content" },
          { label: "Classes", href: "/admin/content" },
          { label: "Add Class" },
        ]}
      />

      <AdminPageHeader
        title="Add Class"
        subtitle="Create a new class under a board"
      />

      <AdminFormCard>
        <form onSubmit={handleSubmit} className="space-y-6">
          <AdminFormField
            id="class-board"
            label="Board"
            required
            error={boardError}
          >
            <Select
              id="class-board"
              value={boardId}
              onChange={(e) => handleBoardChange(e.target.value)}
              onBlur={handleBoardBlur}
              aria-invalid={!!boardError}
              aria-describedby={boardError ? "class-board-error" : undefined}
            >
              <option value="">Select a board</option>
              {boardOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </AdminFormField>

          <AdminFormField
            id="class-name"
            label="Class Name"
            required
            error={nameError}
          >
            <input
              id="class-name"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              onBlur={handleNameBlur}
              placeholder="e.g., 9th"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
              aria-invalid={!!nameError}
              aria-describedby={nameError ? "class-name-error" : undefined}
            />
          </AdminFormField>

          <AdminFormField id="class-slug" label="Slug">
            <input
              id="class-slug"
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
              Create Class
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

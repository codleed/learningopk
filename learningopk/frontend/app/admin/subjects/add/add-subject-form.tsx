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
import { Textarea } from "@/components/ui/textarea";
import {
  createAdminCurriculumSubject,
  type AdminCurriculumBoard,
} from "@/lib/admin-api";
import { useToast } from "@/components/ui/toast";

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
  const [boardClassError, setBoardClassError] = useState("");
  const [nameError, setNameError] = useState("");
  const [descriptionError, setDescriptionError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      await createAdminCurriculumSubject({
        boardClassId: parseInt(boardClassId, 10),
        name: name.trim(),
        slug,
        description: description.trim() || undefined,
      });
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
      <AdminBreadcrumb
        segments={[
          { label: "Admin", href: "/admin" },
          { label: "Content", href: "/admin/content" },
          { label: "Subjects", href: "/admin/content" },
          { label: "Add Subject" },
        ]}
      />

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
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
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
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] cursor-not-allowed"
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

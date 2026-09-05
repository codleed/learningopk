"use client";

import Link from "next/link";
import {
  BookOpen,
  Book,
  GraduationCap,
  FileText,
  Pencil,
  Plus,
  Trash2,
  Folder,
} from "lucide-react";
import { AdminActionButton } from "./action-button";
import { AdminBreadcrumb } from "./breadcrumb";
import { StickyBreadcrumbWrapper } from "@/components/common/sticky-breadcrumb-wrapper";

type EntityType = "board" | "class" | "subject" | "chapter";

type ChildEntity = {
  id: number;
  type: "class" | "subject" | "chapter";
  name: string;
  subtitle?: string;
};

type EntityDetailPanelProps = {
  entity: {
    id: number;
    type: EntityType;
    name: string;
    childCount?: number;
    children?: ChildEntity[];
  } | null;
  breadcrumbSegments: Array<{ label: string; href?: string }>;
  onDelete: (entity: { id: number; type: string; name: string }) => void;
  onRefresh: () => void;
};

const entityTypeConfig: Record<
  EntityType,
  {
    label: string;
    editPath: (id: number) => string;
    addChildPath?: (id: number) => string;
    icon: typeof BookOpen;
  }
> = {
  board: {
    label: "Board",
    editPath: (id) => `/admin/boards/${id}/edit`,
    addChildPath: (id) => `/admin/classes/add?boardId=${id}`,
    icon: BookOpen,
  },
  class: {
    label: "Class",
    editPath: (id) => `/admin/classes/${id}/edit`,
    addChildPath: (id) => `/admin/subjects/add?classId=${id}`,
    icon: GraduationCap,
  },
  subject: {
    label: "Subject",
    editPath: (id) => `/admin/subjects/${id}/edit`,
    addChildPath: (id) => `/admin/chapters/add?subjectId=${id}`,
    icon: Book,
  },
  chapter: {
    label: "Chapter",
    editPath: (id) => `/admin/chapters/${id}/edit`,
    icon: FileText,
  },
};

const childTypeLabel: Record<string, string> = {
  class: "Classes",
  subject: "Subjects",
  chapter: "Chapters",
};

export function AdminEntityDetailPanel({
  entity,
  breadcrumbSegments,
  onDelete,
  onRefresh,
}: EntityDetailPanelProps) {
  if (!entity) {
    return (
      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-8">
        <div className="flex flex-col items-center justify-center text-center">
          <Folder className="mb-4 h-12 w-12 text-[var(--text-secondary)]" />
          <p className="text-sm text-[var(--text-secondary)]">
            Select an entity from the tree to view details and actions
          </p>
        </div>
      </div>
    );
  }

  const config = entityTypeConfig[entity.type];
  const Icon = config.icon;
  const canAddChild = entity.type !== "chapter";
  const childType =
    entity.type === "board" ? "class" : entity.type === "class" ? "subject" : "chapter";

  const handleDelete = () => {
    if (
      window.confirm(
        `Are you sure you want to delete "${entity.name}"? This action cannot be undone.`
      )
    ) {
      onDelete({ id: entity.id, type: entity.type, name: entity.name });
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <StickyBreadcrumbWrapper className="-mx-4 -mt-6 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <AdminBreadcrumb segments={breadcrumbSegments} />
      </StickyBreadcrumbWrapper>

      {/* Main entity card */}
      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
        {/* Header with icon, name, and badge */}
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--primary-light)]">
              <Icon className="h-5 w-5 text-[var(--primary)]" aria-hidden />
            </div>
            <div>
              <h2 className="font-heading text-xl font-semibold text-[var(--text-primary)]">
                {entity.name}
              </h2>
              <span className="inline-flex items-center rounded-full bg-[var(--primary-light)] px-2.5 py-0.5 text-xs font-medium text-[var(--primary)]">
                {config.label}
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          <Link href={config.editPath(entity.id)}>
            <AdminActionButton variant="secondary">
              <Pencil className="mr-2 h-4 w-4" aria-hidden />
              Edit {config.label}
            </AdminActionButton>
          </Link>

          {canAddChild && config.addChildPath && (
            <Link href={config.addChildPath(entity.id)}>
              <AdminActionButton variant="primary">
                <Plus className="mr-2 h-4 w-4" aria-hidden />
                Add {childType.charAt(0).toUpperCase() + childType.slice(1)}
              </AdminActionButton>
            </Link>
          )}

          <AdminActionButton variant="danger" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" aria-hidden />
            Delete
          </AdminActionButton>
        </div>
      </div>

      {/* Child entities preview */}
      {entity.children && entity.children.length > 0 && (
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
          <h3 className="mb-4 font-heading text-sm font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
            {childTypeLabel[childType]} ({entity.children.length})
          </h3>
          <div className="space-y-2">
            {entity.children.map((child) => (
              <div
                key={child.id}
                className="flex items-center gap-3 rounded-lg border border-[var(--border-default)] p-3 transition-colors hover:bg-[var(--bg-subtle)]"
              >
                {child.type === "class" && (
                  <GraduationCap className="h-4 w-4 shrink-0 text-[var(--primary)]" aria-hidden />
                )}
                {child.type === "subject" && (
                  <Book className="h-4 w-4 shrink-0 text-[var(--primary)]" aria-hidden />
                )}
                {child.type === "chapter" && (
                  <FileText className="h-4 w-4 shrink-0 text-[var(--primary)]" aria-hidden />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                    {child.name}
                  </p>
                  {child.subtitle && (
                    <p className="truncate text-xs text-[var(--text-secondary)]">
                      {child.subtitle}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty children state */}
      {entity.children && entity.children.length === 0 && (
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
          <h3 className="mb-4 font-heading text-sm font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
            {childTypeLabel[childType]} (0)
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            No {childTypeLabel[childType].toLowerCase()} yet.
            {canAddChild && (
              <>
                {" "}
                <Link
                  href={config.addChildPath?.(entity.id) || "#"}
                  className="text-[var(--primary)] hover:underline"
                >
                  Add one
                </Link>{" "}
                to get started.
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

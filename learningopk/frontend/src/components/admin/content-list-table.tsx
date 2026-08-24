"use client";

import { Pencil, Trash2, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

export type ColumnDef<T> = {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  className?: string;
};

type ContentListTableProps<T> = {
  title: string;
  items: T[];
  columns: ColumnDef<T>[];
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  editHref?: (item: T) => string;
  deleteHref?: (item: T) => string;
  onPublish?: (item: T) => void;
  publishLabel?: string;
  renderCustomAction?: (item: T) => React.ReactNode;
  addHref: string;
  addLabel?: string;
  emptyMessage?: string;
  loading?: boolean;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  getItemId: (item: T) => string | number;
};

export function ContentListTable<T>({
  title,
  items,
  columns,
  onEdit,
  onDelete,
  editHref,
  deleteHref,
  onPublish,
  publishLabel,
  renderCustomAction,
  addHref,
  addLabel = `Add ${title.replace(/s$/, '')}`,
  emptyMessage = `No ${title.toLowerCase()} found.`,
  loading = false,
  pagination,
  getItemId,
}: ContentListTableProps<T>) {
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 1;
  const startItem = pagination ? (pagination.page - 1) * pagination.pageSize + 1 : 1;
  const endItem = pagination ? Math.min(pagination.page * pagination.pageSize, pagination.total) : items.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-heading text-lg font-semibold text-[var(--text-primary)]">
          {title}
        </h2>
        <Link
          href={addHref}
          className="inline-flex items-center gap-2 rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--primary-light)]"
        >
          <Plus className="h-4 w-4" aria-hidden />
          {addLabel}
        </Link>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)]">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--border-default)] border-t-[var(--primary)]" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-sm text-[var(--text-secondary)]">{emptyMessage}</p>
            <Link
              href={addHref}
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--primary-light)]"
            >
              <Plus className="h-4 w-4" aria-hidden />
              {addLabel}
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-default)] bg-[var(--bg-subtle)]">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]"
                  >
                    {col.header}
                  </th>
                ))}
                {(onEdit || editHref || onDelete || deleteHref || onPublish) && (
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {items.map((item) => {
                const itemId = getItemId(item);
                return (
                  <tr
                    key={itemId}
                    className="transition-colors hover:bg-[var(--bg-subtle)]"
                  >
                    {columns.map((col) => (
                      <td key={col.key} className={`px-3 py-2 text-sm ${col.className || ""}`}>
                        {col.render(item)}
                      </td>
                    ))}
                    {(onEdit || editHref || onDelete || deleteHref || onPublish || renderCustomAction) && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {renderCustomAction ? (
                            renderCustomAction(item)
                          ) : (
                            <>
                              {editHref ? (
                                <Link
                                  href={editHref(item)}
                                  className="inline-flex items-center gap-1 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-subtle)]"
                                >
                                  <Pencil className="h-3 w-3" aria-hidden />
                                  Edit
                                </Link>
                              ) : onEdit ? (
                                <button
                                  onClick={() => onEdit(item)}
                                  className="inline-flex items-center gap-1 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-subtle)]"
                                >
                                  <Pencil className="h-3 w-3" aria-hidden />
                                  Edit
                                </button>
                              ) : null}

                              {onPublish ? (
                                <button
                                  onClick={() => onPublish(item)}
                                  className="inline-flex items-center gap-1 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-subtle)]"
                                >
                                  {publishLabel || "Publish"}
                                </button>
                              ) : null}

                              {deleteHref ? (
                                <Link
                                  href={deleteHref(item)}
                                  className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
                                >
                                  <Trash2 className="h-3 w-3" aria-hidden />
                                  Delete
                                </Link>
                              ) : onDelete ? (
                                <button
                                  onClick={() => onDelete(item)}
                                  className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
                                >
                                  <Trash2 className="h-3 w-3" aria-hidden />
                                  Delete
                                </button>
                              ) : null}
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.total > pagination.pageSize && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--text-secondary)]">
            Showing {startItem}-{endItem} of {pagination.total} {title.toLowerCase()}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="inline-flex items-center gap-1 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-subtle)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              Prev
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => pagination.onPageChange(pageNum)}
                    className={`h-8 w-8 rounded-md text-sm font-medium transition-colors ${
                      pagination.page === pageNum
                        ? "bg-[var(--primary)] text-[var(--text-primary)]"
                        : "bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= totalPages}
              className="inline-flex items-center gap-1 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-subtle)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

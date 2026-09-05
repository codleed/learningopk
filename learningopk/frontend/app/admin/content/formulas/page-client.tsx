"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

import { AdminPageHeader } from "@/components/admin";
import { ContentTabs } from "@/components/admin/content-tabs";
import { ContentStatsStrip } from "@/components/admin/content-stats-strip";
import { ContentListTable, type ColumnDef } from "@/components/admin/content-list-table";
import {
  deleteAdminFormula,
  type AdminCurriculumBoard,
  type FormulaResponse,
} from "@/lib/admin-api";
import { useToast } from "@/components/ui/toast";

type FormulasPageProps = {
  boards: AdminCurriculumBoard[];
  initialFormulas: FormulaResponse[];
  stats: {
    boards: number;
    classes: number;
    subjects: number;
    chapters: number;
    exercises: number;
    quizzes: number;
    flashcardDecks: number;
  };
};

export function FormulasPage({ boards, initialFormulas, stats }: FormulasPageProps) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [filterSubjectId, setFilterSubjectId] = useState<string>("");

  // Build subject options from boards tree
  const subjectOptions = useMemo(() => {
    const options: Array<{ id: number; label: string }> = [];
    for (const board of boards) {
      for (const boardClass of board.classes) {
        for (const subject of boardClass.subjects) {
          options.push({
            id: subject.id,
            label: `${board.name} / ${boardClass.name} / ${subject.name}`,
          });
        }
      }
    }
    return options;
  }, [boards]);

  // Filter formulas by subject
  const filteredFormulas = useMemo(() => {
    if (!filterSubjectId) return initialFormulas;
    const subjectId = parseInt(filterSubjectId, 10);
    return initialFormulas.filter((f) => f.subjectId === subjectId);
  }, [initialFormulas, filterSubjectId]);

  const columns: ColumnDef<FormulaResponse>[] = [
    {
      key: "name",
      header: "Name",
      render: (f) => <span className="font-medium text-[var(--text-primary)]">{f.name}</span>,
    },
    {
      key: "formula",
      header: "Formula",
      render: (f) => (
        <code className="rounded bg-[var(--bg-subtle)] px-2 py-0.5 text-xs font-mono text-[var(--text-secondary)]">
          {f.formulaLatex.length > 50 ? `${f.formulaLatex.slice(0, 50)}...` : f.formulaLatex}
        </code>
      ),
    },
    {
      key: "subject",
      header: "Subject / Chapter",
      render: (f) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-[var(--text-primary)]">
            {f.subjectName ?? `Subject #${f.subjectId}`}
          </span>
          <span className="text-xs text-[var(--text-secondary)]">
            {f.chapterTitle ?? `Chapter #${f.chapterId}`}
          </span>
        </div>
      ),
    },
    {
      key: "tags",
      header: "Tags",
      render: (f) => (
        <div className="flex flex-wrap gap-1">
          {f.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-[var(--bg-subtle)] px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)]"
            >
              {tag}
            </span>
          ))}
          {f.tags.length > 3 && (
            <span className="text-xs text-[var(--text-secondary)]">+{f.tags.length - 3}</span>
          )}
        </div>
      ),
    },
  ];

  const handleDelete = async (formula: FormulaResponse) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${formula.name}"? This action cannot be undone.`
      )
    ) {
      try {
        await deleteAdminFormula(formula.id);
        pushToast({
          title: "Formula deleted",
          description: `"${formula.name}" has been deleted successfully.`,
          tone: "success",
        });
        router.refresh();
      } catch (error) {
        pushToast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to delete formula",
          tone: "error",
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Content Management"
        subtitle="Manage boards, classes, subjects, chapters, exercises, quizzes, flash cards, and formulas"
      />

      <ContentStatsStrip stats={stats} />

      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)]">
        <ContentTabs />

        <div className="p-6">
          {/* Subject filter */}
          <div className="mb-4 flex items-center gap-3">
            <label
              htmlFor="formula-subject-filter"
              className="text-sm font-medium text-[var(--text-secondary)]"
            >
              Filter by Subject:
            </label>
            <select
              id="formula-subject-filter"
              value={filterSubjectId}
              onChange={(e) => setFilterSubjectId(e.target.value)}
              className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            >
              <option value="">All subjects</option>
              {subjectOptions.map((opt) => (
                <option key={opt.id} value={opt.id.toString()}>
                  {opt.label}
                </option>
              ))}
            </select>
            {filterSubjectId && (
              <span className="text-xs text-[var(--text-secondary)]">
                {filteredFormulas.length} formula{filteredFormulas.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          <ContentListTable
            title="Formulas"
            items={filteredFormulas}
            columns={columns}
            onDelete={handleDelete}
            editHref={(f) => `/admin/content/formulas/${f.id}/edit`}
            addHref="/admin/content/formulas/add"
            addLabel="Add Formula"
            emptyMessage="No formulas found. Create your first formula to get started."
            getItemId={(f) => f.id}
          />
        </div>
      </div>
    </div>
  );
}

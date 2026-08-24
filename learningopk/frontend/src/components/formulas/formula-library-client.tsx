"use client";

import { useMemo, useState } from "react";
import { BlockMath } from "react-katex";
import { Copy, Search, Sparkles, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { toggleFormulaStar, recordFormulaAccess, type FormulasResponse } from "@/lib/formulas-api";

type FormulaLibraryClientProps = {
  initialData: FormulasResponse;
  initialQuery: {
    q: string;
    subjectId?: number;
    chapterId?: number;
    tag: string;
  };
};

export function FormulaLibraryClient({ initialData, initialQuery }: FormulaLibraryClientProps) {
  const [formulas, setFormulas] = useState(initialData.items);
  const [expandedFormulaIds, setExpandedFormulaIds] = useState<number[]>([]);

  const chapterOptions = useMemo(
    () =>
      initialQuery.subjectId
        ? initialData.filters.chapters.filter(
            (chapter) => chapter.subjectId === initialQuery.subjectId
          )
        : initialData.filters.chapters,
    [initialData.filters.chapters, initialQuery.subjectId]
  );

  const onToggleExpand = async (formulaId: number) => {
    const isExpanded = expandedFormulaIds.includes(formulaId);
    setExpandedFormulaIds((current) =>
      isExpanded ? current.filter((id) => id !== formulaId) : [...current, formulaId]
    );

    if (!isExpanded) {
      void recordFormulaAccess(formulaId).catch(() => undefined);
    }
  };

  const onToggleStar = async (formulaId: number) => {
    try {
      const result = await toggleFormulaStar(formulaId);
      setFormulas((current) =>
        current.map((formula) =>
          formula.id === formulaId ? { ...formula, isStarred: result.starred } : formula
        )
      );
    } catch {
      // best-effort UI action
    }
  };

  const onCopyLatex = async (latex: string) => {
    try {
      await navigator.clipboard.writeText(latex);
    } catch {
      // no-op
    }
  };

  return (
    <div className="space-y-6">
      <Card variant="default">
        <CardHeader>
          <div className="flex items-center gap-2 text-text-secondary">
            <Search className="h-4 w-4" aria-hidden />
            <p className="text-sm">
              Filters are URL-driven so search, subject, chapter, and tag stay shareable.
            </p>
          </div>
        </CardHeader>
        <CardBody className="grid gap-3 md:grid-cols-4">
          <form method="GET" className="contents">
            <input
              name="q"
              defaultValue={initialQuery.q}
              placeholder="Search formulas..."
              className="h-10 rounded-lg border border-border-default bg-bg-base px-3 text-sm text-text-primary outline-none ring-0"
            />
            <select
              name="subjectId"
              defaultValue={initialQuery.subjectId ? String(initialQuery.subjectId) : ""}
              className="h-10 rounded-lg border border-border-default bg-bg-base px-3 text-sm text-text-primary"
            >
              <option value="">All subjects</option>
              {initialData.filters.subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
            <select
              name="chapterId"
              defaultValue={initialQuery.chapterId ? String(initialQuery.chapterId) : ""}
              className="h-10 rounded-lg border border-border-default bg-bg-base px-3 text-sm text-text-primary"
            >
              <option value="">All chapters</option>
              {chapterOptions.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.title}
                </option>
              ))}
            </select>
            <div className="flex gap-3">
              <select
                name="tag"
                defaultValue={initialQuery.tag}
                className="h-10 flex-1 rounded-lg border border-border-default bg-bg-base px-3 text-sm text-text-primary"
              >
                <option value="">All tags</option>
                {initialData.filters.tags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
              <Button type="submit" variant="primary" size="md">
                Apply
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {formulas.length === 0 ? (
        <Card variant="default">
          <CardBody className="py-10 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-text-muted" aria-hidden />
            <p className="mt-3 text-sm text-text-secondary">
              No formulas match the current search and filters.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {formulas.map((formula) => {
            const isExpanded = expandedFormulaIds.includes(formula.id);
            return (
              <Card key={formula.id} variant="default" className="overflow-hidden">
                <CardHeader className="gap-3 pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="primary" size="sm">
                          {formula.subjectName}
                        </Badge>
                        <Badge variant="default" size="sm">
                          {formula.chapterTitle}
                        </Badge>
                        {formula.tags.map((tag) => (
                          <Badge key={tag} variant="outline" size="sm">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                      <h2 className="text-lg font-semibold text-text-primary">{formula.name}</h2>
                    </div>
                    <button
                      type="button"
                      aria-label={formula.isStarred ? "Unstar formula" : "Star formula"}
                      onClick={() => void onToggleStar(formula.id)}
                      className="rounded-full border border-border-default p-2 text-text-secondary transition-colors hover:text-accent-warning"
                    >
                      <Star
                        className={`h-4 w-4 ${formula.isStarred ? "fill-current text-accent-warning" : ""}`}
                      />
                    </button>
                  </div>
                </CardHeader>
                <CardBody className="space-y-4 pt-0">
                  <div className="rounded-xl border border-border-default bg-bg-base px-4 py-5 text-center">
                    <BlockMath math={formula.formulaLatex} />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void onToggleExpand(formula.id)}
                    >
                      {isExpanded ? "Hide explanation" : "Show explanation"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      iconLeft={<Copy />}
                      onClick={() => void onCopyLatex(formula.formulaLatex)}
                    >
                      Copy LaTeX
                    </Button>
                  </div>

                  {isExpanded ? (
                    <div className="space-y-3 rounded-xl border border-border-default bg-bg-base/60 p-4">
                      <p className="text-sm leading-6 text-text-secondary">{formula.description}</p>
                      {formula.variables.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                            Variables
                          </p>
                          <ul className="space-y-2">
                            {formula.variables.map((variable) => (
                              <li
                                key={`${formula.id}-${variable.symbol}`}
                                className="text-sm text-text-secondary"
                              >
                                <span className="font-semibold text-text-primary">
                                  {variable.symbol}
                                </span>{" "}
                                — {variable.meaning}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

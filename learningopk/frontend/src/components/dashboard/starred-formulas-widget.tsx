import Link from "next/link";
import { BlockMath } from "react-katex";
import { ArrowRight, Star } from "lucide-react";

import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DashboardSummaryResponse } from "@/lib/progress-api";

type StarredFormulasWidgetProps = {
  formulas: DashboardSummaryResponse["starredFormulas"];
};

export function StarredFormulasWidget({ formulas }: StarredFormulasWidgetProps) {
  if (formulas.length === 0) {
    return null;
  }

  return (
    <Card variant="default" className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-warning/10">
              <Star className="h-4 w-4 text-accent-warning" aria-hidden />
            </div>
            <div>
              <h3 className="font-[var(--font-display)] text-base font-bold text-text-primary">
                Starred Formulas
              </h3>
              <p className="text-[11px] text-text-muted">Your most-used formulas</p>
            </div>
          </div>
          <Badge variant="warning" size="sm">
            {formulas.length}
          </Badge>
        </div>
      </CardHeader>
      <CardBody className="flex-1 space-y-2 pt-0">
        {formulas.map((formula) => (
          <div
            key={formula.formulaId}
            className="rounded-xl border border-border-default bg-bg-base p-3 transition-all duration-200 hover:border-accent-warning/30 hover:shadow-[var(--shadow-sm)]"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary leading-snug truncate">
                  {formula.name}
                </p>
                <p className="mt-0.5 text-[11px] text-text-muted">
                  {formula.subjectName} · {formula.chapterTitle}
                </p>
              </div>
              <Badge variant="warning" size="sm" className="shrink-0">
                {formula.accessCount} opens
              </Badge>
            </div>
            <div className="overflow-hidden rounded-lg border border-border-default bg-bg-surface px-3 py-2">
              <BlockMath math={formula.formulaLatex} />
            </div>
          </div>
        ))}

        <Link
          href="/formulas"
          className="group mt-1 flex items-center gap-1.5 text-sm font-semibold text-accent-primary hover:text-accent-primary-hover transition-colors"
        >
          Open Formula Library
          <ArrowRight
            className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
      </CardBody>
    </Card>
  );
}

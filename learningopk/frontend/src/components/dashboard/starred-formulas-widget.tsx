import Link from "next/link";
import { BlockMath } from "react-katex";
import { Star } from "lucide-react";

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
    <Card variant="default">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-[var(--font-display)] text-base font-bold text-text-primary">
            Your Starred Formulas
          </h3>
          <Star className="h-5 w-5 text-accent-warning" aria-hidden />
        </div>
      </CardHeader>
      <CardBody className="space-y-3 pt-0">
        {formulas.map((formula) => (
          <div key={formula.formulaId} className="rounded-xl border border-border-default bg-bg-base p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">{formula.name}</p>
                <p className="text-xs text-text-secondary">
                  {formula.subjectName} · {formula.chapterTitle}
                </p>
              </div>
              <Badge variant="warning" size="sm">
                {formula.accessCount} opens
              </Badge>
            </div>
            <div className="overflow-hidden rounded-lg border border-border-default bg-bg-surface px-3 py-2">
              <BlockMath math={formula.formulaLatex} />
            </div>
          </div>
        ))}

        <Link href="/formulas" className="block text-sm font-semibold text-accent-primary hover:text-accent-primary-hover">
          Open Formula Library
        </Link>
      </CardBody>
    </Card>
  );
}

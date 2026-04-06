import Link from "next/link";
import { ArrowRight, BrainCircuit, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import type { DashboardSummaryResponse } from "@/lib/progress-api";

type SubjectSummary = DashboardSummaryResponse["subjects"][number];

export function SubjectWeakAreasCard({ subjects }: { subjects: SubjectSummary[] }) {
  const subjectsWithWeakAreas = subjects.filter((subject) => subject.weakAreas.length > 0);

  if (subjectsWithWeakAreas.length === 0) {
    return null;
  }

  return (
    <Card variant="default">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <TriangleAlert className="h-5 w-5 text-accent-warning" aria-hidden />
              <h3 className="font-[var(--font-display)] text-base font-bold text-text-primary">
                Your weak areas
              </h3>
            </div>
            <p className="mt-1 text-xs text-text-secondary">
              Based on wrong answers across your 3+ historical quiz attempts per subject.
            </p>
          </div>
          <Badge variant="warning" size="sm">
            Adaptive
          </Badge>
        </div>
      </CardHeader>
      <CardBody className="space-y-4 pt-0">
        {subjectsWithWeakAreas.map((subject) => (
          <div key={subject.subjectId} className="rounded-2xl border border-border-default bg-bg-base p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">{subject.subjectName}</p>
                <p className="mt-1 text-xs text-text-secondary">Practice the repeated mistake patterns first.</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-warning/10 text-accent-warning">
                <BrainCircuit className="h-4 w-4" aria-hidden />
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {subject.weakAreas.map((area) => (
                <div key={`${subject.subjectId}-${area.chapterId}-${area.exerciseId ?? area.label}`} className="rounded-xl border border-border-default bg-bg-surface p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="warning" size="sm">{area.wrongAnswerCount} wrong</Badge>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">{area.quizAttemptsCount} attempts</span>
                  </div>
                  <h4 className="mt-2 text-sm font-semibold leading-snug text-text-primary">{area.label}</h4>
                  <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                    {area.exerciseNumber ? `Exercise ${area.exerciseNumber}` : area.chapterTitle}
                    {area.exerciseQuestion ? ` · ${area.exerciseQuestion}` : ""}
                  </p>
                  <div className="mt-4">
                    <Link href={area.href} className="block">
                      <Button variant="primary" size="sm" width="full" iconRight={<ArrowRight />}>
                        Practice now
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}

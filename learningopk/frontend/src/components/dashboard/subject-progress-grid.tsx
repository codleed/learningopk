import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";

import { StudyCardArt } from "@/components/common/study-card-art";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinearProgress } from "@/components/ui/progress";
import { SubjectBadge } from "@/components/common/subject-badge";
import type { DashboardSummaryResponse } from "@/lib/progress-api";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type SubjectSummary = DashboardSummaryResponse["subjects"][number];

export interface SubjectProgressGridProps {
  subjects: SubjectSummary[];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SubjectProgressGrid({
  subjects,
}: SubjectProgressGridProps) {
  if (subjects.length === 0) {
    return (
      <Card variant="default">
        <CardHeader>
          <h3 className="font-[var(--font-display)] text-base font-bold text-text-primary">
            Subject Progress
          </h3>
        </CardHeader>
        <CardBody className="py-8 text-center">
          <BookOpen
            className="mx-auto h-10 w-10 text-text-muted"
            aria-hidden
          />
          <p className="mt-3 text-sm text-text-secondary">
            No subjects enrolled yet. Start learning to see your progress.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card variant="default">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="font-[var(--font-display)] text-base font-bold text-text-primary">
            Subject Progress
          </h3>
          <Badge variant="default" size="sm">
            {subjects.length} subject{subjects.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </CardHeader>
      <CardBody className="p-3 pt-0">
        <div className="grid gap-3 sm:grid-cols-2">
          {subjects.map((subject) => {
            return (
              <Link
                key={subject.subjectId}
                href={`/dashboard/${subject.boardSlug}/${subject.grade}/${subject.subjectSlug}`}
                className="group block"
              >
                <div className="overflow-hidden rounded-[1.35rem] border border-border-default bg-bg-base transition-all duration-200 hover:border-accent-primary/30 hover:shadow-[var(--shadow-card)]">
                  <div className="p-3 pb-0">
                    <StudyCardArt
                      subject={subject.subjectName}
                      title={`${subject.boardName} • Class ${subject.grade}`}
                      variant="compact"
                    />
                  </div>

                  <div className="p-4 pt-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <SubjectBadge name={subject.subjectName} size="sm" />
                        <h4 className="mt-2 text-base font-semibold text-text-primary truncate">
                          {subject.subjectName}
                        </h4>
                        <p className="mt-0.5 text-xs text-text-secondary">
                          {subject.boardName} &middot; Class {subject.grade}
                        </p>
                      </div>
                      <span className="rounded-full bg-bg-surface px-2.5 py-1 text-xs font-bold tabular-nums text-text-primary">
                        {subject.chaptersVisitedPercent}%
                      </span>
                    </div>

                    <div className="mt-4">
                      <LinearProgress
                        value={subject.chaptersVisitedPercent}
                        barSize="sm"
                        colorVariant={
                          subject.chaptersVisitedPercent >= 80
                            ? "success"
                            : subject.chaptersVisitedPercent >= 40
                              ? "primary"
                              : "warning"
                        }
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-text-muted">
                      {subject.chaptersVisitedPercent}% chapter coverage tracked
                    </p>

                    <div className="mt-4 flex items-center justify-between border-t border-border-default/70 pt-3">
                      <p className="text-xs font-medium text-text-secondary">Open subject workspace</p>
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent-primary transition-transform duration-200 group-hover:translate-x-0.5">
                        View
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}

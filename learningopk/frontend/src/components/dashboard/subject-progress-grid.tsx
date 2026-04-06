import Link from "next/link";
import { BookOpen } from "lucide-react";

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
                <div className="rounded-xl border border-border-default bg-bg-base p-4 transition-all duration-200 hover:border-accent-primary/30 hover:shadow-[var(--shadow-sm)]">
                  <div className="flex items-start justify-between gap-2">
                    <SubjectBadge name={subject.subjectName} size="sm" />
                    <span className="text-xs font-bold tabular-nums text-text-secondary">
                      {subject.chaptersVisitedPercent}%
                    </span>
                  </div>
                  <h4 className="mt-2.5 text-sm font-semibold text-text-primary truncate">
                    {subject.subjectName}
                  </h4>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    {subject.boardName} &middot; Class {subject.grade}
                  </p>
                  <div className="mt-3">
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
                 </div>
               </Link>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}

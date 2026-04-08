import Link from "next/link";
import { ArrowRight, BookOpen, Trophy } from "lucide-react";

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
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getProgressColorVariant(
  percent: number,
): "success" | "primary" | "warning" {
  if (percent >= 80) return "success";
  if (percent >= 40) return "primary";
  return "warning";
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
        <CardBody className="py-12 text-center">
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

  const useThreeColGrid = subjects.length >= 3;

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
        <div
          className={
            useThreeColGrid
              ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
              : "grid gap-3 sm:grid-cols-2"
          }
        >
          {subjects.map((subject) => (
            <SubjectCard key={subject.subjectId} subject={subject} />
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Subject Card                                                       */
/* ------------------------------------------------------------------ */

function SubjectCard({ subject }: { subject: SubjectSummary }) {
  const colorVariant = getProgressColorVariant(subject.chaptersVisitedPercent);
  const hasQuizScore = subject.bestQuizScorePercent > 0;

  return (
    <Link
      href={`/dashboard/${subject.boardSlug}/${subject.grade}/${subject.subjectSlug}`}
      className="group block"
    >
      <div className="overflow-hidden rounded-2xl border border-border-default bg-bg-base shadow-[var(--shadow-sm)] transition-all duration-200 hover:-translate-y-0.5 hover:border-accent-primary/30 hover:shadow-[var(--shadow-card)]">
        {/* ── Art area with gradient fade ── */}
        <div className="relative p-3 pb-0">
          <StudyCardArt
            subject={subject.subjectName}
            title={`${subject.boardName} • Class ${subject.grade}`}
            variant="compact"
          />
          {/* Gradient overlay: transparent → card bg */}
          <div
            className="pointer-events-none absolute inset-x-3 bottom-0 h-12 rounded-b-[1.25rem]"
            style={{
              background:
                "linear-gradient(to bottom, transparent 0%, var(--bg-base) 100%)",
            }}
            aria-hidden="true"
          />
        </div>

        {/* ── Content ── */}
        <div className="p-4 pt-2">
          {/* Subject identity */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SubjectBadge name={subject.subjectName} size="sm" />
              <h4 className="mt-2 truncate text-base font-semibold text-text-primary">
                {subject.subjectName}
              </h4>
              <p className="mt-0.5 text-xs text-text-secondary">
                {subject.boardName} &middot; Class {subject.grade}
              </p>
            </div>

            {/* Large prominent percentage */}
            <span className="shrink-0 text-2xl font-bold tabular-nums text-text-primary">
              {subject.chaptersVisitedPercent}
              <span className="text-sm font-semibold text-text-muted">%</span>
            </span>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <LinearProgress
              value={subject.chaptersVisitedPercent}
              barSize="md"
              colorVariant={colorVariant}
            />
          </div>

          <p className="mt-1.5 text-[11px] text-text-muted">
            {subject.chaptersVisitedPercent}% chapter coverage tracked
          </p>

          {/* Quiz score line */}
          {hasQuizScore ? (
            <div className="mt-2 flex items-center gap-1.5">
              <Trophy
                className="h-3 w-3 text-accent-warning"
                aria-hidden="true"
              />
              <span className="text-[11px] font-medium text-text-secondary">
                Best quiz: {subject.bestQuizScorePercent}%
              </span>
            </div>
          ) : null}

          {/* Footer action */}
          <div className="mt-4 flex items-center justify-between border-t border-border-default/70 pt-3">
            <p className="text-xs font-medium text-text-secondary">
              Open subject workspace
            </p>
            <span
              className="inline-flex h-6 w-6 items-center justify-center rounded-full text-text-muted transition-all duration-200 group-hover:bg-accent-primary/10 group-hover:text-accent-primary"
              aria-hidden="true"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

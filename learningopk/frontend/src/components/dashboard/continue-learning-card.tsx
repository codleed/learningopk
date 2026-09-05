"use client";

import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";

import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SubjectBadge } from "@/components/common/subject-badge";
import { ProgressRing } from "@/components/common/progress-ring";
import type { DashboardSummaryResponse } from "@/lib/progress-api";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type SubjectSummary = DashboardSummaryResponse["subjects"][number];

export interface ContinueLearningCardProps {
  subject: SubjectSummary | null;
  continueHref: string | null;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Return motivational micro-copy based on current progress percentage. */
function getEncouragement(percent: number): string {
  if (percent === 0) return "Let's get started!";
  if (percent < 25) return "Great start — keep going!";
  if (percent < 50) return "You're building momentum!";
  if (percent < 75) return "Over halfway — keep it up!";
  if (percent < 100) return "Almost there, finish strong!";
  return "Subject complete — well done!";
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ContinueLearningCard({ subject, continueHref }: ContinueLearningCardProps) {
  /* ── Empty state ── */
  if (!subject) {
    return (
      <Card variant="default" className="h-full">
        <CardBody className="flex flex-col items-center justify-center gap-4 py-12">
          <div
            className="flex items-center justify-center rounded-xl"
            style={{
              width: 56,
              height: 56,
              background: "var(--accent-primary-light)",
            }}
          >
            <BookOpen className="h-6 w-6 text-accent-primary" aria-hidden />
          </div>

          <div className="text-center">
            <h3 className="font-[var(--font-display)] text-base font-bold text-text-primary">
              Continue Learning
            </h3>
            <p className="mt-1 text-sm text-text-secondary">
              Start a chapter to track your progress here.
            </p>
          </div>
        </CardBody>
      </Card>
    );
  }

  /* ── Hero state ── */
  const percent = subject.chaptersVisitedPercent;

  return (
    <Card variant="default" className="h-full">
      <CardBody className="flex flex-col gap-5 p-5">
        {/* Top row: label */}
        <span className="text-xs font-semibold uppercase tracking-widest text-text-muted">
          Continue Learning
        </span>

        {/* Center: progress ring + subject info */}
        <div className="flex items-center gap-5">
          <ProgressRing percentage={percent} size={72} strokeWidth={5} />

          <div className="min-w-0 flex-1 space-y-1.5">
            <SubjectBadge name={subject.subjectName} size="sm" />

            <h3 className="font-[var(--font-display)] text-lg font-bold leading-snug text-text-primary truncate">
              {subject.subjectName}
            </h3>

            <p className="text-xs text-text-secondary">
              {subject.boardName} · Class {subject.grade}
            </p>
          </div>
        </div>

        {/* Motivational micro-copy */}
        <p className="text-sm font-medium text-accent-primary">{getEncouragement(percent)}</p>

        {/* CTA */}
        {continueHref ? (
          <Link href={continueHref} className="block">
            <Button variant="primary" size="md" width="full" iconRight={<ArrowRight />}>
              Continue
            </Button>
          </Link>
        ) : (
          <Link
            href={`/dashboard/${subject.boardSlug}/${subject.grade}/${subject.subjectSlug}`}
            className="block"
          >
            <Button variant="secondary" size="md" width="full" iconRight={<ArrowRight />}>
              View Subject
            </Button>
          </Link>
        )}
      </CardBody>
    </Card>
  );
}

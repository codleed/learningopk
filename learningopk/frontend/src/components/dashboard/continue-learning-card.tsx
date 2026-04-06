"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, PlayCircle } from "lucide-react";

import { Card, CardHeader, CardBody } from "@/components/ui/card";
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
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ContinueLearningCard({
  subject,
  continueHref,
}: ContinueLearningCardProps) {
  if (!subject) {
    return (
      <Card variant="default" className="h-full">
        <CardHeader>
          <h3 className="font-[var(--font-display)] text-base font-bold text-text-primary">
            Continue Learning
          </h3>
        </CardHeader>
        <CardBody className="flex flex-col items-center justify-center gap-3 py-8">
          <BookOpen className="h-10 w-10 text-text-muted" aria-hidden />
          <p className="text-sm text-text-secondary text-center">
            Start a chapter to track your progress here.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card variant="default" className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h3 className="font-[var(--font-display)] text-base font-bold text-text-primary">
            Continue Learning
          </h3>
          <PlayCircle
            className="h-5 w-5 text-accent-primary"
            aria-hidden
          />
        </div>
      </CardHeader>
      <CardBody className="flex-1 flex flex-col justify-between gap-4">
        <div className="flex items-start gap-4">
          <ProgressRing
            percentage={subject.chaptersVisitedPercent}
            size={64}
            strokeWidth={5}
          />
          <div className="min-w-0 flex-1">
            <SubjectBadge name={subject.subjectName} size="sm" />
            <h4 className="mt-1.5 text-sm font-semibold text-text-primary leading-snug truncate">
              {subject.subjectName}
            </h4>
            <p className="mt-0.5 text-xs text-text-secondary">
              {subject.boardName} &middot; Class {subject.grade}
            </p>
          </div>
        </div>
        {continueHref ? (
          <Link href={continueHref} className="block">
            <Button
              variant="primary"
              size="sm"
              width="full"
              iconRight={<ArrowRight />}
            >
              Continue
            </Button>
          </Link>
        ) : (
          <Link href={`/dashboard/${subject.boardSlug}/${subject.grade}/${subject.subjectSlug}`} className="block">
            <Button
              variant="secondary"
              size="sm"
              width="full"
              iconRight={<ArrowRight />}
            >
              View Subject
            </Button>
          </Link>
        )}
      </CardBody>
    </Card>
  );
}

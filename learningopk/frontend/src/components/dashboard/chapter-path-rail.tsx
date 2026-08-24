import Link from "next/link";
import { ArrowRight, Check, Circle } from "lucide-react";

import type { DashboardSummaryResponse } from "@/lib/progress-api";

type SubjectSummary = DashboardSummaryResponse["subjects"][number];

type ChapterPathRailProps = {
  subject: SubjectSummary | null;
  firstChapterBasePath: string | null;
};

export function ChapterPathRail({ subject, firstChapterBasePath }: ChapterPathRailProps) {
  if (!subject) return null;

  const progress = subject.chaptersVisitedPercent;
  const currentHref = firstChapterBasePath ?? `/subjects/${subject.subjectSlug}`;
  const currentLabel = progress === 0 ? "Start here" : progress >= 100 ? "Ready to revise" : "Continue here";

  return (
    <section aria-labelledby="chapter-path-title" className="border-y border-border-default py-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-accent-primary">Your path</p>
          <h2 id="chapter-path-title" className="mt-1 font-[var(--font-display)] text-xl font-semibold text-text-primary">
            {subject.subjectName} chapter path
          </h2>
        </div>
        <Link href={currentHref} className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-primary hover:text-accent-primary-hover">
          {currentLabel}<ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
      <div className="mt-5 grid grid-cols-[auto_1fr_auto] items-center gap-3 text-sm">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-primary text-accent-primary-fg" aria-label="Completed chapters">
          <Check className="h-4 w-4" aria-hidden />
        </span>
        <div className="h-px bg-accent-primary" aria-hidden />
        <span className="text-text-secondary">Completed</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-accent-primary bg-accent-primary-light text-accent-primary" aria-label="Current chapter">
          <Circle className="h-3 w-3 fill-current" aria-hidden />
        </span>
        <div className="h-px bg-border-default" aria-hidden />
        <span className="font-medium text-text-primary">Now · {Math.round(progress)}%</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border-strong text-text-muted" aria-label="Next chapter">
          <Circle className="h-3 w-3" aria-hidden />
        </span>
        <div className="h-px bg-border-default" aria-hidden />
        <span className="text-text-muted">Next</span>
      </div>
    </section>
  );
}

export type { ChapterPathRailProps };

import Link from "next/link";

import { Badge } from "@/components/ui";
import type { SubjectResponse } from "@/lib/learn-api";

type SubjectWeightageListProps = {
  boardSlug: string;
  classSlug: string;
  subjectSlug: string;
  chapters: SubjectResponse["chapters"];
  recommendation: SubjectResponse["recommendation"];
};

export function SubjectWeightageList({ boardSlug, classSlug, subjectSlug, chapters, recommendation }: SubjectWeightageListProps) {
  const ordered = [...chapters].sort((a, b) => {
    if (b.weightagePercentage !== a.weightagePercentage) {
      return b.weightagePercentage - a.weightagePercentage;
    }
    if (b.avgMarks !== a.avgMarks) {
      return b.avgMarks - a.avgMarks;
    }
    return a.chapterNumber - b.chapterNumber;
  });

  return (
    <div className="space-y-4">
      {recommendation ? (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-text-primary">
          Focus {recommendation.focusPercent}% of your time on these {recommendation.chapterCount} high-weight chapters: {recommendation.chapters.join(", ")}
        </div>
      ) : null}

      <div className="space-y-3">
        {ordered.map((chapter) => (
          <Link
            key={chapter.id}
            href={`/${boardSlug}/${classSlug}/${subjectSlug}/${chapter.slug}`}
            className="block rounded-xl border border-border-default bg-bg-subtle/70 p-4 transition hover:border-accent-primary/35 hover:bg-bg-surface"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  Chapter {chapter.chapterNumber}: {chapter.title}
                </p>
                <p className="text-xs text-text-secondary">
                  Appeared in {chapter.weightagePercentage}% of recent exams • Avg {Math.round(chapter.avgMarks)} marks
                </p>
              </div>
              <Badge variant={chapter.weightagePercentage >= 60 ? "warning" : "outline"}>{chapter.weightagePercentage}%</Badge>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800/80">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500"
                style={{ width: `${Math.max(chapter.weightagePercentage, 4)}%` }}
              />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

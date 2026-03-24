import Link from "next/link";

import type { DashboardSummaryResponse } from "@/lib/progress-api";

type SubjectSummary = DashboardSummaryResponse["subjects"][number];

type SubjectProgressCardProps = {
  subject: SubjectSummary;
};

const formatDate = (isoDate: string): string =>
  new Date(isoDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });

export function SubjectProgressCard({ subject }: SubjectProgressCardProps) {
  return (
    <article className="surface-card rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-foreground">{subject.subjectName}</h3>
          <p className="text-xs text-muted-foreground">
            {subject.boardName} Grade {subject.grade}
          </p>
        </div>
        <Link href={`/dashboard/${subject.subjectSlug}`} className="text-xs font-semibold text-foreground underline underline-offset-4">
          View details
        </Link>
      </div>
      <div className="mt-4 space-y-2 text-sm text-foreground/95">
        <p>Chapters visited: {subject.chaptersVisitedPercent}%</p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${subject.chaptersVisitedPercent}%` }} />
        </div>
        <p>Best quiz score: {subject.bestQuizScorePercent}%</p>
        <p>Last active: {subject.lastActiveAt ? formatDate(subject.lastActiveAt) : "No activity yet"}</p>
      </div>
    </article>
  );
}


import type { DashboardSummaryResponse } from "@/lib/progress-api";

import { DashboardCard } from "@/components/foundation/dashboard-primitives";
import { EmptyState } from "@/components/ui/states";

type SubjectProgressOverviewProps = {
  subjects: DashboardSummaryResponse["subjects"];
  weakSubjectSlugs: Set<string>;
};

const formatDate = (isoDate: string | null): string => {
  if (!isoDate) {
    return "No activity yet";
  }

  return new Date(isoDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
};

export function SubjectProgressOverview({ subjects, weakSubjectSlugs }: SubjectProgressOverviewProps) {
  if (subjects.length === 0) {
    return (
      <EmptyState
        title="No subject progress yet"
        description="Start learning chapters to populate subject-wise progress."
      />
    );
  }

  return (
    <div className="space-y-3">
      {subjects.map((subject) => (
        <DashboardCard key={subject.subjectId} className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-base font-semibold text-foreground">{subject.subjectName}</p>
              <p className="text-xs text-muted-foreground">
                {subject.boardName} Grade {subject.grade}
              </p>
            </div>
            {weakSubjectSlugs.has(subject.subjectSlug) ? (
              <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">
                Needs focus
              </span>
            ) : (
              <span className="rounded-full border border-emerald-300 bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-900">
                On track
              </span>
            )}
          </div>

          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Chapter completion</p>
              <p className="mt-1 text-lg font-medium text-foreground">{subject.chaptersVisitedPercent}%</p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                <span className="block h-full rounded-full bg-[var(--primary)]" style={{ width: `${subject.chaptersVisitedPercent}%` }} />
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Best quiz score</p>
              <p className="mt-1 text-lg font-medium text-foreground">{subject.bestQuizScorePercent}%</p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${subject.bestQuizScorePercent}%` }} />
              </div>
            </div>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">Last active: {formatDate(subject.lastActiveAt)}</p>
        </DashboardCard>
      ))}
    </div>
  );
}

import Link from "next/link";

import { Card, CardBody } from "@/components/ui/card";
import { LinearProgress } from "@/components/ui/progress";
import { SubjectBadge } from "@/components/common/subject-badge";
import { BoardBadge } from "@/components/common/board-badge";
import type { DashboardSummaryResponse } from "@/lib/progress-api";

type SubjectSummary = DashboardSummaryResponse["subjects"][number];

type SubjectProgressCardProps = {
  subject: SubjectSummary;
};

const formatDate = (isoDate: string): string =>
  new Date(isoDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export function SubjectProgressCard({ subject }: SubjectProgressCardProps) {
  return (
    <Card variant="default">
      <CardBody>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <SubjectBadge name={subject.subjectName} size="sm" />
              <BoardBadge board={subject.boardSlug} size="sm" />
            </div>
            <h3 className="font-[var(--font-display)] text-sm font-bold text-text-primary">
              {subject.subjectName}
            </h3>
            <p className="text-xs text-text-secondary">
              {subject.boardName} &middot; Grade {subject.grade}
            </p>
          </div>
          <Link
            href={`/dashboard/${subject.boardSlug}/${subject.grade}/${subject.subjectSlug}`}
            className="text-xs font-semibold text-accent-primary hover:underline underline-offset-4 shrink-0"
          >
            View details
          </Link>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <LinearProgress
              value={subject.chaptersVisitedPercent}
              label="Chapters visited"
              showValue
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

          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>
              Best quiz score:{" "}
              <span className="font-semibold text-text-primary">
                {subject.bestQuizScorePercent}%
              </span>
            </span>
            <span>
              {subject.lastActiveAt
                ? `Last active: ${formatDate(subject.lastActiveAt)}`
                : "No activity yet"}
            </span>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

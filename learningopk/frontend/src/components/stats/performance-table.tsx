"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Clock, Trophy } from "lucide-react";

import { SubjectBadge } from "@/components/common/subject-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetricLabel } from "@/components/stats/metric-label";
import type { DashboardSummaryResponse } from "@/lib/progress-api";

/** Minimal subject routing info so the table can build links. */
interface SubjectRouteInfo {
  subjectSlug: string;
  boardSlug: string;
  grade: string;
}

interface PerformanceTableProps {
  quizHistory: DashboardSummaryResponse["quizHistory"];
  /** Subject routing lookup — when provided, rows with < 70 % accuracy show a "Practice more" link. */
  subjectRoutes?: SubjectRouteInfo[];
}

export function PerformanceTable({ quizHistory, subjectRoutes = [] }: PerformanceTableProps) {
  /* Build a slug → route map for quick lookup */
  const routeMap = useMemo(() => {
    const map = new Map<string, SubjectRouteInfo>();
    for (const route of subjectRoutes) {
      map.set(route.subjectSlug, route);
    }
    return map;
  }, [subjectRoutes]);

  const sortedQuizzes = useMemo(
    () =>
      [...quizHistory]
        .sort(
          (a, b) =>
            new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
        )
        .slice(0, 20),
    [quizHistory]
  );

  if (sortedQuizzes.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-text-muted">
        No quiz attempts yet. Complete some quizzes to see your performance here.
      </div>
    );
  }

  const getScoreVariant = (percentage: number) => {
    if (percentage >= 80) return "success";
    if (percentage >= 60) return "warning";
    return "danger";
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-PK", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  /* Estimate time: ~2 min per question (rough heuristic) */
  const estimateTime = (totalMarks: number) => {
    const minutes = Math.max(1, Math.round(totalMarks * 1.5));
    return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  };

  /* Estimate XP: score-based */
  const estimateXP = (score: number, totalMarks: number) => {
    return Math.round((score / Math.max(totalMarks, 1)) * 50) + 10;
  };

  return (
    <div className="overflow-x-auto -mx-5">
      <table className="w-full min-w-[680px] text-sm" role="table">
        <thead>
          <tr className="border-b border-border-default">
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">
              Date
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">
              Subject
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">
              Chapter
            </th>
            <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-text-muted">
              Score
            </th>
            <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-text-muted">
              <MetricLabel
                label="~Time"
                explanation="Estimated from quiz completion times and activity logs. Not directly measured."
                side="bottom"
              />
            </th>
            <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-text-muted">
              <MetricLabel
                label="XP"
                explanation="Calculated based on quiz scores and study activity. Not a tracked server value."
                side="bottom"
              />
            </th>
            {subjectRoutes.length > 0 && (
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">
                <span className="sr-only">Action</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {sortedQuizzes.map((quiz, index) => {
            const route = routeMap.get(quiz.subjectSlug);
            const subjectHref = route
              ? `/${route.boardSlug}/${route.grade}/${route.subjectSlug}`
              : null;
            const showPracticeLink = quiz.percentage < 70 && subjectHref;

            return (
              <motion.tr
                key={`${quiz.occurredAt}-${quiz.chapterSlug}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.25 }}
                className="border-b border-border-default/50 transition-colors hover:bg-bg-subtle/50"
              >
                <td className="px-5 py-3 text-text-secondary tabular-nums">
                  {formatDate(quiz.occurredAt)}
                </td>
                <td className="px-5 py-3">
                  <SubjectBadge name={quiz.subjectName} size="sm" />
                </td>
                <td className="px-5 py-3 text-text-primary max-w-[200px] truncate" title={quiz.chapterTitle}>
                  {quiz.chapterTitle}
                </td>
                <td className="px-5 py-3 text-center">
                  <Badge variant={getScoreVariant(quiz.percentage)} size="sm">
                    {quiz.score}/{quiz.totalMarks} ({quiz.percentage}%)
                  </Badge>
                </td>
                <td className="px-5 py-3 text-center">
                  <span className="inline-flex items-center gap-1 text-text-secondary">
                    <Clock className="h-3 w-3" aria-hidden />
                    ~{estimateTime(quiz.totalMarks)}
                  </span>
                </td>
                <td className="px-5 py-3 text-center">
                  <span className="inline-flex items-center gap-1 font-semibold text-accent-primary">
                    <Trophy className="h-3 w-3" aria-hidden />
                    ~+{estimateXP(quiz.score, quiz.totalMarks)}
                  </span>
                </td>
                {subjectRoutes.length > 0 && (
                  <td className="px-5 py-3 text-right">
                    {showPracticeLink ? (
                      <Link href={subjectHref}>
                        <Button
                          variant="ghost"
                          size="xs"
                          iconRight={<ArrowRight />}
                          disableAnimation
                        >
                          Practice more
                        </Button>
                      </Link>
                    ) : null}
                  </td>
                )}
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

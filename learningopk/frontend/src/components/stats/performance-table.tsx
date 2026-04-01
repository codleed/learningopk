"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Clock, Trophy } from "lucide-react";

import { SubjectBadge } from "@/components/common/subject-badge";
import { Badge } from "@/components/ui/badge";
import type { DashboardSummaryResponse } from "@/lib/progress-api";

interface PerformanceTableProps {
  quizHistory: DashboardSummaryResponse["quizHistory"];
}

export function PerformanceTable({ quizHistory }: PerformanceTableProps) {
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
              Time
            </th>
            <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-text-muted">
              XP
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedQuizzes.map((quiz, index) => (
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
                  {estimateTime(quiz.totalMarks)}
                </span>
              </td>
              <td className="px-5 py-3 text-center">
                <span className="inline-flex items-center gap-1 font-semibold text-accent-primary">
                  <Trophy className="h-3 w-3" aria-hidden />
                  +{estimateXP(quiz.score, quiz.totalMarks)}
                </span>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

"use client";

import { motion, useReducedMotion } from "framer-motion";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { LinearProgress } from "@/components/ui/progress";
import { PERFORMANCE_EXCELLENT_THRESHOLD, PERFORMANCE_PASS_THRESHOLD } from "@/lib/quiz-constants";

type SectionScore = {
  chapterId: number | null;
  chapterTitle: string | null;
  chapterNumber: number | null;
  score: number;
  totalMarks: number;
  questionCount: number;
  correctCount: number;
};

type WeakArea = {
  chapterId: number;
  chapterTitle: string;
  chapterNumber: number;
  correctPercentage: number;
  wrongQuestionCount: number;
  totalQuestions: number;
};

type MockExamResultDetailsProps = {
  sectionScores: SectionScore[];
  weakAreas: WeakArea[] | undefined;
};

export function MockExamResultDetails({ sectionScores, weakAreas }: MockExamResultDetailsProps) {
  const reduced = useReducedMotion();

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {/* Section-wise scores */}
      <Card variant="elevated" className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-primary-light">
            <TrendingUp className="h-4 w-4 text-accent-primary" />
          </div>
          <h4 className="font-display text-sm font-semibold text-text-primary">
            Section-wise Performance
          </h4>
        </div>

        <div className="space-y-3">
          {sectionScores.map((section, index) => {
            const percentage = section.totalMarks > 0
              ? Math.round((section.score / section.totalMarks) * 100)
              : 0;

            const colorVariant =
              percentage >= PERFORMANCE_EXCELLENT_THRESHOLD
                ? "success" as const
                : percentage >= PERFORMANCE_PASS_THRESHOLD
                  ? "warning" as const
                  : "danger" as const;

            return (
              <motion.div
                key={index}
                initial={reduced ? false : { opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={reduced ? { duration: 0 } : { delay: index * 0.08 }}
                className="rounded-lg border border-border-default bg-bg-surface p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {section.chapterTitle ?? "General"}
                      {section.chapterNumber ? ` (Ch. ${section.chapterNumber})` : ""}
                    </p>
                    <p className="mt-0.5 text-xs text-text-secondary">
                      {section.correctCount}/{section.questionCount} correct
                    </p>
                  </div>
                  <Badge variant={colorVariant} size="sm">
                    {percentage}%
                  </Badge>
                </div>

                <div className="mt-2.5">
                  <LinearProgress
                    value={percentage}
                    barSize="sm"
                    colorVariant={colorVariant}
                  />
                </div>

                <p className="mt-1.5 text-[11px] text-text-secondary">
                  Score: {section.score}/{section.totalMarks} marks
                </p>
              </motion.div>
            );
          })}
        </div>
      </Card>

      {/* Weak areas recommendation */}
      <Card variant="elevated" className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-danger-light">
            <TrendingDown className="h-4 w-4 text-accent-danger" />
          </div>
          <h4 className="font-display text-sm font-semibold text-text-primary">
            Weak Areas to Revise
          </h4>
        </div>

        {weakAreas && weakAreas.length > 0 ? (
          <div className="space-y-3">
            {weakAreas.map((area, index) => (
              <motion.div
                key={index}
                initial={reduced ? false : { opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={reduced ? { duration: 0 } : { delay: index * 0.08 }}
                className="rounded-lg border border-accent-danger/20 bg-accent-danger-light p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-accent-danger" />
                    <p className="text-sm font-medium text-text-primary">
                      {area.chapterTitle}
                      {area.chapterNumber > 0 ? ` (Ch. ${area.chapterNumber})` : ""}
                    </p>
                  </div>
                  <Badge variant="danger" size="sm">
                    {Math.round(area.correctPercentage)}%
                  </Badge>
                </div>
                <p className="mt-1.5 pl-5.5 text-xs text-text-secondary">
                  {area.wrongQuestionCount} of {area.totalQuestions} questions incorrect.
                  Review this chapter to improve your score.
                </p>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={reduced ? false : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={reduced ? { duration: 0 } : undefined}
            className="flex flex-col items-center gap-2 rounded-lg border border-accent-success/20 bg-accent-success-light p-5 text-center"
          >
            <CheckCircle className="h-6 w-6 text-accent-success" />
            <p className="text-sm font-medium text-accent-success">
              Great job! No weak areas identified.
            </p>
            <p className="text-xs text-text-secondary">
              You scored 70% or above in all sections.
            </p>
          </motion.div>
        )}

        {/* Time management tip */}
        <div className="mt-4 border-t border-border-default pt-4">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-text-secondary" />
            <h5 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Time Management
            </h5>
          </div>
          <p className="mt-1.5 text-xs text-text-secondary leading-relaxed">
            Review your time allocation across sections to optimize your exam strategy.
          </p>
        </div>
      </Card>
    </div>
  );
}

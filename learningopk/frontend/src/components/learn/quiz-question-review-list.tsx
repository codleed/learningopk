"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Check, X, Minus } from "lucide-react";

import type { QuizResult } from "./quiz-runner";
import { ContentRenderer } from "@/components/common/content-renderer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type QuizQuestionReviewListProps = {
  result: QuizResult;
};

const optionLabels: Record<string, string> = { a: "A", b: "B", c: "C", d: "D" };

export function QuizQuestionReviewList({ result }: QuizQuestionReviewListProps) {
  return (
    <div className="space-y-3">
      <h3 className="font-display text-lg font-semibold text-text-primary">
        Review Answers
      </h3>
      <div className="space-y-2">
        {result.questionResults.map((entry, index) => (
          <ReviewItem key={entry.questionId} entry={entry} index={index} />
        ))}
      </div>
    </div>
  );
}

type ReviewEntry = QuizResult["questionResults"][number];

function ReviewItem({ entry, index }: { entry: ReviewEntry; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusIcon = entry.isCorrect ? (
    <Check className="h-3.5 w-3.5" />
  ) : entry.selectedOption === null ? (
    <Minus className="h-3.5 w-3.5" />
  ) : (
    <X className="h-3.5 w-3.5" />
  );

  const statusColor = entry.isCorrect
    ? "bg-accent-success text-white"
    : entry.selectedOption === null
      ? "bg-accent-warning text-white"
      : "bg-accent-danger text-white";

  const statusBadgeVariant = entry.isCorrect
    ? "success" as const
    : entry.selectedOption === null
      ? "warning" as const
      : "danger" as const;

  const statusLabel = entry.isCorrect
    ? "Correct"
    : entry.selectedOption === null
      ? "Skipped"
      : "Incorrect";

  return (
    <Card className="overflow-hidden">
      {/* Collapsed header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-primary/40"
        aria-expanded={isExpanded}
      >
        {/* Status icon */}
        <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md", statusColor)}>
          {statusIcon}
        </span>

        {/* Question number & text preview */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Q{index + 1}
            </span>
            {entry.chapterTitle && (
              <span className="text-[11px] text-text-secondary">
                {entry.chapterTitle}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-sm font-medium text-text-primary">
            {entry.question.replace(/[#*`_~]/g, "").slice(0, 80)}
            {entry.question.length > 80 ? "..." : ""}
          </p>
        </div>

        {/* Status badge & marks */}
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant={statusBadgeVariant} size="sm">
            {statusLabel}
          </Badge>
          <span className="text-xs font-semibold tabular-nums text-text-secondary">
            {entry.awardedMarks}/{entry.marks}
          </span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-text-secondary" />
          ) : (
            <ChevronDown className="h-4 w-4 text-text-secondary" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-border-default px-4 py-4 space-y-4">
              {/* Full question */}
              <div className="text-sm text-text-primary">
                <ContentRenderer content={entry.question} variant="compact" />
              </div>

              {/* Options display */}
              <div className="grid gap-2">
                {(["a", "b", "c", "d"] as const).map((opt) => {
                  const optKey = `option${opt.toUpperCase()}` as keyof typeof entry;
                  const text = entry[optKey] as string;
                  const isCorrect = entry.correctOption === opt;
                  const isUserChoice = entry.selectedOption === opt;

                  return (
                    <div
                      key={opt}
                      className={cn(
                        "flex items-start gap-2.5 rounded-lg border px-3 py-2 text-sm",
                        isCorrect && "border-accent-success/30 bg-accent-success-light",
                        isUserChoice && !isCorrect && "border-accent-danger/30 bg-accent-danger-light",
                        !isCorrect && !isUserChoice && "border-border-default bg-bg-surface"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold",
                          isCorrect && "bg-accent-success text-white",
                          isUserChoice && !isCorrect && "bg-accent-danger text-white",
                          !isCorrect && !isUserChoice && "bg-bg-subtle text-text-secondary border border-border-default"
                        )}
                      >
                        {isCorrect ? <Check className="h-3 w-3" /> : isUserChoice ? <X className="h-3 w-3" /> : optionLabels[opt]}
                      </span>
                      <span className={cn(
                        "flex-1",
                        isCorrect && "text-accent-success font-medium",
                        isUserChoice && !isCorrect && "text-accent-danger",
                        !isCorrect && !isUserChoice && "text-text-secondary"
                      )}>
                        {text}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Explanation */}
              {entry.explanation && (
                <div className="rounded-lg border border-accent-primary/20 bg-accent-primary-light p-3.5">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-accent-primary">
                    Explanation
                  </p>
                  <div className="text-sm text-text-primary">
                    <ContentRenderer content={entry.explanation} variant="compact" />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

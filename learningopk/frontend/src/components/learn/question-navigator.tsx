"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AnswerOption = "a" | "b" | "c" | "d";

type QuizQuestion = {
  id: number;
};

type QuestionNavigatorProps = {
  questions: QuizQuestion[];
  currentIndex: number;
  answers: Record<string, AnswerOption>;
  onSelectQuestion: (index: number) => void;
  isLocked: boolean;
};

export function QuestionNavigator({
  questions,
  currentIndex,
  answers,
  onSelectQuestion,
  isLocked
}: QuestionNavigatorProps) {
  const totalQuestions = questions.length;

  const questionStatuses = useMemo(() => {
    const statuses: Array<"answered" | "unanswered" | "current"> = [];
    for (let i = 0; i < totalQuestions; i++) {
      const questionId = questions[i]?.id;
      if (questionId === undefined) {
        statuses.push("unanswered");
        continue;
      }
      if (i === currentIndex) {
        statuses.push("current");
      } else if (answers[String(questionId)]) {
        statuses.push("answered");
      } else {
        statuses.push("unanswered");
      }
    }
    return statuses;
  }, [questions, totalQuestions, currentIndex, answers]);

  const answeredCount = Object.keys(answers).length;
  const unansweredCount = totalQuestions - answeredCount;

  return (
    <div className="flex h-full flex-col rounded-xl border border-border-default bg-bg-surface">
      {/* Header */}
      <div className="border-b border-border-default p-3">
        <p className="font-display text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Question Navigator
        </p>
        <div className="mt-2.5 flex gap-3 text-[11px] text-text-secondary">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-accent-primary" />
            <span>Current</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-accent-success" />
            <span>Answered ({answeredCount})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full border border-border-default bg-bg-subtle" />
            <span>Unanswered ({unansweredCount})</span>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-5 gap-1.5">
          {questionStatuses.map((status, index) => {
            const isCurrent = status === "current";
            const isAnswered = status === "answered";

            return (
              <motion.button
                key={index}
                type="button"
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={cn(
                  "relative flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition-all duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40 focus-visible:ring-offset-1",
                  "disabled:pointer-events-none disabled:opacity-50",
                  isCurrent && "bg-accent-primary text-white shadow-[var(--shadow-sm)]",
                  isAnswered && !isCurrent && "bg-accent-success-light text-accent-success border border-accent-success/20",
                  !isCurrent && !isAnswered && "bg-bg-subtle text-text-secondary border border-border-default hover:border-border-strong hover:bg-bg-elevated"
                )}
                onClick={() => onSelectQuestion(index)}
                disabled={isLocked}
                aria-label={`Go to question ${index + 1} (${status})`}
                aria-current={isCurrent ? "step" : undefined}
              >
                {isCurrent && (
                  <motion.span
                    layoutId="nav-ring"
                    className="absolute inset-0 rounded-lg ring-2 ring-accent-primary/40"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                {index + 1}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border-default p-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          width="full"
          onClick={() => onSelectQuestion(0)}
          disabled={isLocked}
        >
          Go to First Question
        </Button>
      </div>
    </div>
  );
}

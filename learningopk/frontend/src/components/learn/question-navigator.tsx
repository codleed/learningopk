"use client";

import { useMemo } from "react";

import { Button } from "@/components/ui/button";

type AnswerOption = "a" | "b" | "c" | "d";

type QuestionNavigatorProps = {
  totalQuestions: number;
  currentIndex: number;
  answers: Record<string, AnswerOption>;
  onSelectQuestion: (index: number) => void;
  isLocked: boolean;
};

export function QuestionNavigator({
  totalQuestions,
  currentIndex,
  answers,
  onSelectQuestion,
  isLocked
}: QuestionNavigatorProps) {
  const questionStatuses = useMemo(() => {
    const statuses: Array<"answered" | "unanswered" | "current"> = [];
    for (let i = 0; i < totalQuestions; i++) {
      const questionId = String(i + 1);
      if (i === currentIndex) {
        statuses.push("current");
      } else if (answers[questionId]) {
        statuses.push("answered");
      } else {
        statuses.push("unanswered");
      }
    }
    return statuses;
  }, [totalQuestions, currentIndex, answers]);

  const answeredCount = Object.keys(answers).length;
  const unansweredCount = totalQuestions - answeredCount;

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card">
      <div className="border-b border-border p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Question Navigator</p>
        <div className="mt-2 flex gap-3 text-xs">
          <div className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-full bg-emerald-500" />
            <span>Answered ({answeredCount})</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-full border border-border bg-muted" />
            <span>Unanswered ({unansweredCount})</span>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-5 gap-1.5">
          {questionStatuses.map((status, index) => {
            const isCurrent = status === "current";
            const isAnswered = status === "answered";
            
            return (
              <Button
                key={index}
                type="button"
                variant={isCurrent ? "primary" : "secondary"}
                size="sm"
                className={`h-8 w-8 p-0 text-xs ${
                  isAnswered && !isCurrent
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    : ""
                }`}
                onClick={() => onSelectQuestion(index)}
                disabled={isLocked}
              >
                {index + 1}
              </Button>
            );
          })}
        </div>
      </div>
      <div className="border-t border-border p-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={() => onSelectQuestion(0)}
          disabled={isLocked}
        >
          Go to First Question
        </Button>
      </div>
    </div>
  );
}

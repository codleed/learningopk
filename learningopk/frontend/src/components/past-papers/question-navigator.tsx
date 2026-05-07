"use client";

import { CheckCircle2 } from "lucide-react";

export function QuestionNavigator({
  totalQuestions,
  answeredQuestions,
  currentIndex,
  onNavigate
}: {
  totalQuestions: number;
  answeredQuestions: Set<number>;
  currentIndex: number;
  onNavigate: (index: number) => void;
}) {
  return (
    <nav className="flex flex-wrap gap-1.5">
      {Array.from({ length: totalQuestions }, (_, i) => {
        const isAnswered = answeredQuestions.has(i);
        const isCurrent = i === currentIndex;
        return (
          <button
            key={i}
            onClick={() => onNavigate(i)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-all ${
              isCurrent
                ? "bg-accent-primary text-white ring-2 ring-accent-primary/30"
                : isAnswered
                  ? "bg-accent-success-light text-accent-success"
                  : "bg-surface-secondary text-text-secondary hover:bg-surface-tertiary"
            }`}
          >
            {isAnswered ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
          </button>
        );
      })}
    </nav>
  );
}

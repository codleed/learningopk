"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check, X } from "lucide-react";

import type { ChapterDetailResponse } from "@/lib/learn-api";
import { cn } from "@/lib/utils";
import { ContentRenderer } from "@/components/common/content-renderer";
import { Card } from "@/components/ui/card";

type Quiz = NonNullable<ChapterDetailResponse["quiz"]>;
type QuizQuestion = Quiz["questions"][number];
type AnswerOption = "a" | "b" | "c" | "d";

type QuizQuestionCardProps = {
  question: QuizQuestion;
  questionNumber: number;
  selectedAnswer: AnswerOption | undefined;
  locked: boolean;
  onSelect: (option: AnswerOption) => void;
  /** Post-submit: show correct/incorrect feedback */
  showFeedback?: boolean;
  correctAnswer?: AnswerOption;
};

const answerOptionEntries: Array<{ key: AnswerOption; label: string }> = [
  { key: "a", label: "A" },
  { key: "b", label: "B" },
  { key: "c", label: "C" },
  { key: "d", label: "D" }
];

const getOptionText = (question: QuizQuestion, option: AnswerOption): string => {
  switch (option) {
    case "a":
      return question.optionA;
    case "b":
      return question.optionB;
    case "c":
      return question.optionC;
    case "d":
      return question.optionD;
  }
};

export function QuizQuestionCard({
  question,
  questionNumber,
  selectedAnswer,
  locked,
  onSelect,
  showFeedback = false,
  correctAnswer,
}: QuizQuestionCardProps) {
  const reduced = useReducedMotion();

  const handleKeyDown = (event: React.KeyboardEvent<HTMLFieldSetElement>) => {
    if (locked || !selectedAnswer) return;

    const currentIndex = answerOptionEntries.findIndex((opt) => opt.key === selectedAnswer);
    let nextIndex: number | null = null;

    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight":
        nextIndex = (currentIndex + 1) % answerOptionEntries.length;
        break;
      case "ArrowUp":
      case "ArrowLeft":
        nextIndex = (currentIndex - 1 + answerOptionEntries.length) % answerOptionEntries.length;
        break;
      default:
        return;
    }

    event.preventDefault();
    onSelect(answerOptionEntries[nextIndex].key);
  };

  return (
    <article className="space-y-5">
      {/* Question text */}
      <Card variant="elevated" className="p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-primary text-xs font-bold text-white">
            {questionNumber}
          </span>
          <div className="min-w-0 flex-1 text-sm font-medium text-text-primary leading-relaxed">
            <ContentRenderer content={question.question} variant="compact" />
          </div>
        </div>
      </Card>

      {/* Answer options */}
      <fieldset onKeyDown={handleKeyDown} disabled={locked}>
        <legend className="sr-only">Options for question {questionNumber}</legend>
        <div
          role="radiogroup"
          aria-label={`Options for question ${questionNumber}`}
          className="grid gap-2.5"
        >
          {answerOptionEntries.map((option, index) => {
            const isSelected = selectedAnswer === option.key;
            const isCorrectOption = showFeedback && correctAnswer === option.key;
            const isWrongSelected = showFeedback && isSelected && correctAnswer !== option.key;
            const isCorrectSelected = showFeedback && isSelected && correctAnswer === option.key;

            return (
              <motion.label
                key={option.key}
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduced ? { duration: 0 } : { delay: index * 0.05, duration: 0.25, ease: "easeOut" }}
                className={cn(
                  "group relative flex cursor-pointer items-start gap-3 rounded-xl border-2 px-4 py-3.5 text-sm transition-all duration-150",
                  "focus-within:ring-2 focus-within:ring-accent-primary/30 focus-within:ring-offset-1",
                  /* Default state */
                  !isSelected && !showFeedback && "border-border-default bg-bg-surface hover:border-border-strong hover:bg-bg-elevated",
                  /* Selected (pre-submit) */
                  isSelected && !showFeedback && "border-accent-primary bg-accent-primary-light",
                  /* Post-submit: correct answer selected */
                  isCorrectSelected && "border-accent-success bg-accent-success-light",
                  /* Post-submit: wrong answer selected */
                  isWrongSelected && "border-accent-danger bg-accent-danger-light",
                  /* Post-submit: highlight correct answer if wrong was selected */
                  isCorrectOption && !isSelected && "border-accent-success bg-accent-success-light",
                  /* Post-submit: non-relevant options */
                  showFeedback && !isCorrectOption && !isSelected && "border-border-default bg-bg-surface opacity-50",
                  /* Locked */
                  locked && !showFeedback && "cursor-not-allowed opacity-60"
                )}
              >
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={option.key}
                  checked={isSelected}
                  onChange={() => onSelect(option.key)}
                  disabled={locked}
                  className="sr-only"
                />

                {/* Option letter indicator */}
                <span
                  className={cn(
                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-all duration-150",
                    !isSelected && !showFeedback && "border border-border-default bg-bg-subtle text-text-secondary group-hover:border-border-strong",
                    isSelected && !showFeedback && "bg-accent-primary text-white",
                    isCorrectSelected && "bg-accent-success text-white",
                    isWrongSelected && "bg-accent-danger text-white",
                    isCorrectOption && !isSelected && "bg-accent-success text-white",
                    showFeedback && !isCorrectOption && !isSelected && "border border-border-default bg-bg-subtle text-text-secondary"
                  )}
                  aria-hidden="true"
                >
                  {isCorrectSelected || (isCorrectOption && !isSelected) ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : isWrongSelected ? (
                    <X className="h-3.5 w-3.5" />
                  ) : (
                    option.label
                  )}
                </span>

                {/* Option text */}
                <span className="flex-1 pt-0.5 text-text-primary leading-relaxed">
                  <ContentRenderer content={getOptionText(question, option.key)} variant="compact" />
                </span>
              </motion.label>
            );
          })}
        </div>
      </fieldset>
    </article>
  );
}

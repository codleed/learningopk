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
  { key: "d", label: "D" },
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
          className="flex flex-col gap-1"
        >
          {answerOptionEntries.map((option, index) => {
            const isSelected = selectedAnswer === option.key;
            const isCorrectOption = showFeedback && correctAnswer === option.key;
            const isWrongSelected = showFeedback && isSelected && correctAnswer !== option.key;
            const isCorrectSelected = showFeedback && isSelected && correctAnswer === option.key;

            return (
              <motion.label
                key={option.key}
                initial={reduced ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={
                  reduced
                    ? { duration: 0 }
                    : { delay: index * 0.04, duration: 0.2, ease: "easeOut" }
                }
                className={cn(
                  "group relative flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors duration-100",
                  /* Default state */
                  !isSelected && !showFeedback && "hover:bg-bg-subtle",
                  /* Selected (pre-submit) */
                  isSelected && !showFeedback && "bg-accent-primary-light text-accent-primary",
                  /* Post-submit: correct answer selected */
                  isCorrectSelected && "bg-accent-success-light text-accent-success",
                  /* Post-submit: wrong answer selected */
                  isWrongSelected && "bg-accent-danger-light text-accent-danger",
                  /* Post-submit: highlight correct answer if wrong was selected */
                  isCorrectOption && !isSelected && "bg-accent-success-light text-accent-success",
                  /* Post-submit: non-relevant options */
                  showFeedback && !isCorrectOption && !isSelected && "opacity-40",
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
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] font-bold transition-colors duration-100",
                    !isSelected && !showFeedback && "text-text-muted",
                    isSelected && !showFeedback && "bg-accent-primary text-white",
                    isCorrectSelected && "bg-accent-success text-white",
                    isWrongSelected && "bg-accent-danger text-white",
                    isCorrectOption && !isSelected && "bg-accent-success text-white",
                    showFeedback && !isCorrectOption && !isSelected && "text-text-muted"
                  )}
                  aria-hidden="true"
                >
                  {isCorrectSelected || (isCorrectOption && !isSelected) ? (
                    <Check className="h-3 w-3" />
                  ) : isWrongSelected ? (
                    <X className="h-3 w-3" />
                  ) : (
                    option.label
                  )}
                </span>

                {/* Option text */}
                <span className="flex-1 text-text-primary text-sm leading-snug">
                  <ContentRenderer
                    content={getOptionText(question, option.key)}
                    variant="compact"
                  />
                </span>
              </motion.label>
            );
          })}
        </div>
      </fieldset>
    </article>
  );
}

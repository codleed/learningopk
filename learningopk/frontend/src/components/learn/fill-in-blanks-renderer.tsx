"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Check, X, RotateCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/* ─── Types ─── */

type BlankStatus = "unanswered" | "correct" | "incorrect";

type FillInBlanksRendererProps = {
  question: string;
  blanksAnswer: string[];
  onComplete?: () => void;
  className?: string;
};

type CheckedState = {
  statuses: BlankStatus[];
  allCorrect: boolean;
};

/* ─── Constants ─── */

const BLANK_MARKER = "{{blank}}";

const feedbackVariants = {
  initial: { opacity: 0, y: -4, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -4, scale: 0.95 },
};

const feedbackTransition = {
  type: "spring" as const,
  stiffness: 500,
  damping: 30,
};

const iconVariants = {
  initial: { scale: 0, rotate: -90 },
  animate: { scale: 1, rotate: 0 },
};

const iconTransition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 20,
  delay: 0.1,
};

/* ─── Helpers ─── */

function parseQuestion(text: string): string[] {
  return text.split(BLANK_MARKER);
}

function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase();
}

/* ─── Component ─── */

export function FillInBlanksRenderer({
  question,
  blanksAnswer,
  onComplete,
  className,
}: FillInBlanksRendererProps) {
  const reduced = useReducedMotion();
  const segments = useMemo(() => parseQuestion(question), [question]);
  const blankCount = blanksAnswer.length;

  const [userAnswers, setUserAnswers] = useState<string[]>(() =>
    Array.from<string>({ length: blankCount }).fill("")
  );
  const [checked, setChecked] = useState<CheckedState | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const setInputRef = useCallback(
    (index: number) => (el: HTMLInputElement | null) => {
      inputRefs.current[index] = el;
    },
    []
  );

  const handleInputChange = useCallback(
    (index: number, value: string) => {
      setUserAnswers((prev) => {
        const next = [...prev];
        next[index] = value;
        return next;
      });
    },
    []
  );

  const handleKeyDown = useCallback(
    (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        const nextInput = inputRefs.current[index + 1];
        if (nextInput) {
          nextInput.focus();
        }
      }
    },
    []
  );

  const handleCheckAnswers = useCallback(() => {
    const statuses: BlankStatus[] = blanksAnswer.map((correct, index) => {
      const userValue = userAnswers[index] ?? "";
      return normalizeAnswer(userValue) === normalizeAnswer(correct)
        ? "correct"
        : "incorrect";
    });

    const allCorrect = statuses.every((s) => s === "correct");

    setChecked({ statuses, allCorrect });

    if (allCorrect) {
      onComplete?.();
    }
  }, [blanksAnswer, userAnswers, onComplete]);

  const handleReset = useCallback(() => {
    setUserAnswers(Array.from<string>({ length: blankCount }).fill(""));
    setChecked(null);

    // Focus the first input after reset
    requestAnimationFrame(() => {
      inputRefs.current[0]?.focus();
    });
  }, [blankCount]);

  const isChecked = checked !== null;
  const hasAtLeastOneAnswer = userAnswers.some((a) => a.trim().length > 0);

  /* ─── Render ─── */

  let blankIndex = 0;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Question text with inline blanks */}
      <div className="text-sm leading-relaxed text-text-primary">
        <p className="flex flex-wrap items-baseline gap-y-2">
          {segments.map((segment, segIdx) => {
            const currentBlankIndex = blankIndex;
            const isLastSegment = segIdx === segments.length - 1;

            // Increment blank index for every segment except the last
            if (!isLastSegment) {
              blankIndex++;
            }

            return (
              <span key={segIdx} className="contents">
                {/* Text segment rendered with inline markdown + math */}
                {segment && (
                  <span className="inline md-root [&_p]:inline [&_p]:m-0">
                    <ReactMarkdown
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                    >
                      {segment}
                    </ReactMarkdown>
                  </span>
                )}

                {/* Blank input (one fewer blank than segments) */}
                {!isLastSegment && (
                  <BlankInput
                    index={currentBlankIndex}
                    value={userAnswers[currentBlankIndex] ?? ""}
                    status={checked?.statuses[currentBlankIndex] ?? "unanswered"}
                    correctAnswer={blanksAnswer[currentBlankIndex] ?? ""}
                    disabled={isChecked}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    inputRef={setInputRef(currentBlankIndex)}
                  />
                )}
              </span>
            );
          })}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <AnimatePresence mode="wait">
          {!isChecked ? (
            <motion.div
              key="check-btn"
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -8 }}
              transition={reduced ? { duration: 0 } : { duration: 0.2 }}
            >
              <Button
                variant="primary"
                size="sm"
                disabled={!hasAtLeastOneAnswer}
                onClick={handleCheckAnswers}
              >
                Check Answers
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="try-again-btn"
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -8 }}
              transition={reduced ? { duration: 0 } : { duration: 0.2 }}
              className="flex items-center gap-3"
            >
              <Button
                variant="secondary"
                size="sm"
                iconLeft={<RotateCcw />}
                onClick={handleReset}
              >
                Try Again
              </Button>

              {checked.allCorrect && (
                <motion.div
                  initial={reduced ? false : { opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={reduced ? { duration: 0 } : { delay: 0.15, type: "spring", stiffness: 400, damping: 25 }}
                >
                  <Badge variant="success" size="md">
                    All correct!
                  </Badge>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─── Blank Input Sub-component ─── */

type BlankInputProps = {
  index: number;
  value: string;
  status: BlankStatus;
  correctAnswer: string;
  disabled: boolean;
  onChange: (index: number, value: string) => void;
  onKeyDown: (index: number, event: React.KeyboardEvent<HTMLInputElement>) => void;
  inputRef: (el: HTMLInputElement | null) => void;
};

function BlankInput({
  index,
  value,
  status,
  correctAnswer,
  disabled,
  onChange,
  onKeyDown,
  inputRef,
}: BlankInputProps) {
  const reduced = useReducedMotion();
  const isCorrect = status === "correct";
  const isIncorrect = status === "incorrect";
  const isChecked = status !== "unanswered";

  return (
    <span className="relative mx-1 inline-flex flex-col items-center">
      {/* Number badge */}
      <span
        className="absolute -top-2.5 left-0.5 select-none text-[10px] font-medium text-text-muted"
        aria-hidden="true"
      >
        {index + 1}
      </span>

      {/* Input wrapper with feedback icon */}
      <span className="relative inline-flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(index, e.target.value)}
          onKeyDown={(e) => onKeyDown(index, e)}
          aria-label={`Blank ${index + 1}`}
          aria-describedby={isIncorrect ? `blank-${index}-correction` : undefined}
          autoComplete="off"
          spellCheck={false}
          className={cn(
            "inline-block w-24 border-b-2 bg-transparent text-center text-sm py-0.5",
            "focus:outline-none transition-colors duration-200",
            /* Default state */
            !isChecked && "border-border-default focus:border-accent-primary",
            /* Correct */
            isCorrect && "border-emerald-500 bg-emerald-500/10",
            /* Incorrect */
            isIncorrect && "border-rose-500 bg-rose-500/10",
            /* Disabled */
            disabled && "cursor-not-allowed opacity-80"
          )}
        />

        {/* Feedback icon */}
        <AnimatePresence>
          {isChecked && (
            <motion.span
              variants={reduced ? undefined : iconVariants}
              initial={reduced ? false : "initial"}
              animate={reduced ? undefined : "animate"}
              transition={reduced ? { duration: 0 } : iconTransition}
              className={cn(
                "ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full",
                isCorrect && "bg-emerald-500 text-white",
                isIncorrect && "bg-rose-500 text-white"
              )}
              aria-hidden="true"
            >
              {isCorrect ? (
                <Check className="h-2.5 w-2.5" strokeWidth={3} />
              ) : (
                <X className="h-2.5 w-2.5" strokeWidth={3} />
              )}
            </motion.span>
          )}
        </AnimatePresence>
      </span>

      {/* Correct answer hint for incorrect answers */}
      <AnimatePresence>
        {isIncorrect && (
          <motion.span
            id={`blank-${index}-correction`}
            variants={reduced ? undefined : feedbackVariants}
            initial={reduced ? false : "initial"}
            animate={reduced ? undefined : "animate"}
            exit={reduced ? undefined : "exit"}
            transition={reduced ? { duration: 0 } : feedbackTransition}
            className="mt-0.5 text-xs text-emerald-600"
            role="status"
          >
            {correctAnswer}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

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

type Statement = {
  text: string;
  blanksAnswer: string[];
};

type FillInBlanksRendererProps = {
  question?: string;
  blanksAnswer?: string[] | null;
  statements?: Statement[] | null;
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

/* ─── Sub-components ─── */

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
      <span
        className="absolute -top-2.5 left-0.5 select-none text-[10px] font-medium text-text-muted"
        aria-hidden="true"
      >
        {index + 1}
      </span>

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
            !isChecked && "border-border-default focus:border-accent-primary",
            isCorrect && "border-emerald-500 bg-emerald-500/10",
            isIncorrect && "border-rose-500 bg-rose-500/10",
            disabled && "cursor-not-allowed opacity-80"
          )}
        />

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

/* ─── Statement Reader ─── */

type StatementBlockProps = {
  stmtIndex: number;
  statement: Statement;
  userAnswers: string[];
  checked: CheckedState | null;
  disabled: boolean;
  onChange: (stmtIndex: number, blankIndex: number, value: string) => void;
  onKeyDown: (stmtIndex: number, blankIndex: number, event: React.KeyboardEvent<HTMLInputElement>) => void;
  inputRefs: React.MutableRefObject<(HTMLInputElement | null)[][]>;
};

function StatementBlock({
  stmtIndex,
  statement,
  userAnswers,
  checked,
  disabled,
  onChange,
  onKeyDown,
  inputRefs,
}: StatementBlockProps) {
  const segments = useMemo(() => parseQuestion(statement.text), [statement.text]);

  const setInputRef = useCallback(
    (blankIndex: number) => (el: HTMLInputElement | null) => {
      if (!inputRefs.current[stmtIndex]) {
        inputRefs.current[stmtIndex] = [];
      }
      inputRefs.current[stmtIndex][blankIndex] = el;
    },
    [stmtIndex, inputRefs]
  );

  let blankIndex = 0;

  return (
    <div className="text-sm leading-relaxed text-text-primary">
      <span className="text-xs font-semibold text-text-muted mr-2 select-none">
        {stmtIndex + 1}.
      </span>
      <p className="inline flex-wrap items-baseline gap-y-2">
        {segments.map((segment, segIdx) => {
          const currentBlankIndex = blankIndex;
          const isLastSegment = segIdx === segments.length - 1;

          if (!isLastSegment) {
            blankIndex++;
          }

          return (
            <span key={segIdx} className="contents">
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

              {!isLastSegment && (
                <BlankInput
                  index={currentBlankIndex}
                  value={userAnswers[currentBlankIndex] ?? ""}
                  status={checked?.statuses[currentBlankIndex] ?? "unanswered"}
                  correctAnswer={statement.blanksAnswer[currentBlankIndex] ?? ""}
                  disabled={disabled}
                  onChange={(idx, val) => onChange(stmtIndex, idx, val)}
                  onKeyDown={(idx, e) => onKeyDown(stmtIndex, idx, e)}
                  inputRef={setInputRef(currentBlankIndex)}
                />
              )}
            </span>
          );
        })}
      </p>
    </div>
  );
}

/* ─── Main Component ─── */

export function FillInBlanksRenderer({
  question,
  blanksAnswer,
  statements,
  onComplete,
  className,
}: FillInBlanksRendererProps) {
  const reduced = useReducedMotion();

  // Normalize to internal statements array (support both legacy and new format)
  const internalStatements: Statement[] = useMemo(() => {
    if (statements && statements.length > 0) {
      return statements.filter((s) => s.text && s.blanksAnswer.length > 0);
    }
    if (question && blanksAnswer && blanksAnswer.length > 0) {
      return [{ text: question, blanksAnswer }];
    }
    return [];
  }, [question, blanksAnswer, statements]);

  const totalBlanks = useMemo(
    () => internalStatements.reduce((sum, s) => sum + s.blanksAnswer.length, 0),
    [internalStatements]
  );

  // Per-statement user answers: array of arrays, each with the correct number of blanks
  const [userAnswers, setUserAnswers] = useState<string[][]>(() =>
    internalStatements.map((s) =>
      Array.from<string>({ length: s.blanksAnswer.length }).fill("")
    )
  );
  // Per-statement checked state
  const [checkedStates, setCheckedStates] = useState<CheckedState[]>(() =>
    internalStatements.map(() => ({
      statuses: [],
      allCorrect: false,
    }))
  );

  const inputRefs = useRef<(HTMLInputElement | null)[][]>(
    internalStatements.map(() => [])
  );

  const anyChecked = checkedStates.some((cs) => cs.statuses.length > 0);
  const hasAtLeastOneAnswer = useMemo(
    () => userAnswers.some((stmtAnswers) => stmtAnswers.some((a) => a.trim().length > 0)),
    [userAnswers]
  );

  // Per-statement correct counts
  const stmtScores = useMemo(
    () =>
      checkedStates.map((cs, i) => {
        const stmt = internalStatements[i];
        const correct = cs.statuses.filter((s) => s === "correct").length;
        return { total: stmt?.blanksAnswer.length ?? 0, correct };
      }),
    [checkedStates, internalStatements]
  );

  const totalCorrect = stmtScores.reduce((sum, s) => sum + s.correct, 0);
  const allCorrect = totalBlanks > 0 && totalCorrect === totalBlanks;

  const handleInputChange = useCallback(
    (stmtIndex: number, blankIndex: number, value: string) => {
      setUserAnswers((prev) => {
        const next = prev.map((arr) => [...arr]);
        if (next[stmtIndex]) {
          next[stmtIndex][blankIndex] = value;
        }
        return next;
      });
    },
    []
  );

  const handleCheckAll = useCallback(() => {
    const newCheckedStates: CheckedState[] = internalStatements.map(
      (statement, stmtIndex) => {
        const statuses: BlankStatus[] = statement.blanksAnswer.map(
          (correct, blankIndex) => {
            const userValue = userAnswers[stmtIndex]?.[blankIndex] ?? "";
            return normalizeAnswer(userValue) === normalizeAnswer(correct)
              ? "correct"
              : "incorrect";
          }
        );
        return {
          statuses,
          allCorrect: statuses.every((s) => s === "correct"),
        };
      }
    );

    setCheckedStates(newCheckedStates);

    const allCorrectNow = newCheckedStates.every((s) => s.allCorrect);
    if (allCorrectNow) {
      onComplete?.();
    }
  }, [internalStatements, userAnswers, onComplete]);

  const handleKeyDown = useCallback(
    (stmtIndex: number, blankIndex: number, event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        // Navigate to next blank in same statement, or next statement's first blank
        const currentStmt = internalStatements[stmtIndex];
        if (!currentStmt) return;

        if (blankIndex + 1 < currentStmt.blanksAnswer.length) {
          // Next blank in same statement
          inputRefs.current[stmtIndex]?.[blankIndex + 1]?.focus();
        } else if (stmtIndex + 1 < internalStatements.length) {
          // First blank of next statement
          inputRefs.current[stmtIndex + 1]?.[0]?.focus();
        } else {
          // Last blank — check all
          handleCheckAll();
        }
      }
    },
    [internalStatements, handleCheckAll]
  );

  const handleReset = useCallback(() => {
    setUserAnswers(
      internalStatements.map((s) =>
        Array.from<string>({ length: s.blanksAnswer.length }).fill("")
      )
    );
    setCheckedStates(
      internalStatements.map(() => ({
        statuses: [],
        allCorrect: false,
      }))
    );

    requestAnimationFrame(() => {
      inputRefs.current[0]?.[0]?.focus();
    });
  }, [internalStatements]);

  /* ─── Empty state ─── */

  if (internalStatements.length === 0) {
    return null;
  }

  /* ─── Render ─── */

  return (
    <div className={cn("space-y-4", className)}>
      {/* Statement blocks */}
      <div className="space-y-3">
        {internalStatements.map((statement, stmtIndex) => {
          return (
            <div
              key={stmtIndex}
              className={cn(
                "rounded-lg border p-3 transition-colors duration-200",
                checkedStates[stmtIndex]?.allCorrect
                  ? "border-emerald-500/30 bg-emerald-500/[0.03]"
                  : anyChecked &&
                    checkedStates[stmtIndex]?.statuses.some(
                      (s) => s === "incorrect"
                    )
                  ? "border-rose-500/30 bg-rose-500/[0.03]"
                  : "border-border-default bg-bg-surface"
              )}
            >
              <StatementBlock
                stmtIndex={stmtIndex}
                statement={statement}
                userAnswers={userAnswers[stmtIndex] ?? []}
                checked={checkedStates[stmtIndex] ?? null}
                disabled={anyChecked}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                inputRefs={inputRefs}
              />
            </div>
          );
        })}
      </div>

      {/* Action buttons + score summary */}
      <div className="flex items-center gap-3 flex-wrap">
        <AnimatePresence mode="wait">
          {!anyChecked ? (
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
                onClick={handleCheckAll}
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
              className="flex items-center gap-3 flex-wrap"
            >
              <Button
                variant="secondary"
                size="sm"
                iconLeft={<RotateCcw />}
                onClick={handleReset}
              >
                Try Again
              </Button>

              <motion.div
                initial={reduced ? false : { opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={
                  reduced
                    ? { duration: 0 }
                    : { delay: 0.1, type: "spring", stiffness: 400, damping: 25 }
                }
              >
                {allCorrect ? (
                  <Badge variant="success" size="md">
                    All {totalBlanks} correct!
                  </Badge>
                ) : (
                  <Badge variant="warning" size="md">
                    {totalCorrect}/{totalBlanks} correct
                  </Badge>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useCallback, type ChangeEvent, type ReactNode } from "react";
import { Eye, TextCursorInput, CheckCircle } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* ─── Constants ─── */

const BLANK_PATTERN = /\{\{blank\}\}/g;
const HINT_TEXT =
  "Use {{blank}} to mark fill-in positions. Example: The force is {{blank}} Newtons.";

/* ─── Props ─── */

type FillInBlanksEditorProps = {
  questionValue: string;
  onQuestionChange: (value: string) => void;
  answersValue: string[];
  onAnswersChange: (answers: string[]) => void;
  disabled?: boolean;
  className?: string;
};

/* ─── Helpers ─── */

/** Count how many `{{blank}}` tokens appear in a string. */
function countBlanks(text: string): number {
  const matches = text.match(BLANK_PATTERN);
  return matches ? matches.length : 0;
}

/**
 * Split the question text around `{{blank}}` placeholders.
 * Returns an alternating array of text-segments and blank-indices.
 *
 * E.g. "A is {{blank}} and B is {{blank}}" →
 *   [{ type: "text", value: "A is " },
 *    { type: "blank", index: 0 },
 *    { type: "text", value: " and B is " },
 *    { type: "blank", index: 1 }]
 */
type PreviewSegment =
  | { type: "text"; value: string }
  | { type: "blank"; index: number };

function parseSegments(question: string): PreviewSegment[] {
  const parts = question.split(BLANK_PATTERN);
  const segments: PreviewSegment[] = [];
  let blankIdx = 0;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part !== undefined && part.length > 0) {
      segments.push({ type: "text", value: part });
    }
    // Insert a blank marker between each split part (not after the last one)
    if (i < parts.length - 1) {
      segments.push({ type: "blank", index: blankIdx });
      blankIdx++;
    }
  }

  return segments;
}

/* ─── Component ─── */

export function FillInBlanksEditor({
  questionValue,
  onQuestionChange,
  answersValue,
  onAnswersChange,
  disabled = false,
  className,
}: FillInBlanksEditorProps) {
  /* ── Derived state ── */

  const blankCount = useMemo(() => countBlanks(questionValue), [questionValue]);

  const previewSegments = useMemo(
    () => parseSegments(questionValue),
    [questionValue],
  );

  /* ── Handlers ── */

  const handleQuestionChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const next = e.target.value;
      onQuestionChange(next);

      // Sync answers array length to new blank count
      const nextCount = countBlanks(next);
      if (nextCount !== answersValue.length) {
        const synced: string[] = Array.from({ length: nextCount }, (_, i) =>
          i < answersValue.length ? (answersValue[i] ?? "") : "",
        );
        onAnswersChange(synced);
      }
    },
    [onQuestionChange, onAnswersChange, answersValue],
  );

  const handleAnswerChange = useCallback(
    (index: number, value: string) => {
      const updated = answersValue.map((v, i) => (i === index ? value : v));
      onAnswersChange(updated);
    },
    [answersValue, onAnswersChange],
  );

  /* ── Render helpers ── */

  const renderPreviewBlank = (index: number): ReactNode => {
    const answer = answersValue[index] ?? "";
    const hasAnswer = answer.trim().length > 0;

    return (
      <span key={`blank-${index}`} className="inline-flex flex-col items-center mx-1">
        <span
          className={cn(
            "inline-block border-b-2 border-accent-primary min-w-[80px] text-center",
            "px-2 py-0.5 text-sm font-medium",
            hasAnswer ? "text-text-primary" : "text-text-muted",
          )}
        >
          {hasAnswer ? answer : "_______"}
        </span>
        {hasAnswer && (
          <span className="text-xs text-accent-success mt-0.5 font-medium">
            {answer}
          </span>
        )}
      </span>
    );
  };

  /* ── JSX ── */

  return (
    <div className={cn("space-y-4", className)}>
      {/* ── 1. Question Editor ── */}
      <section className="space-y-1">
        <div className="flex items-center gap-2 mb-1.5">
          <TextCursorInput className="h-4 w-4 text-text-muted" />
          <span className="text-sm font-semibold text-text-primary">
            Question
          </span>
          {blankCount > 0 && (
            <Badge variant="primary" size="sm">
              {blankCount} {blankCount === 1 ? "blank" : "blanks"}
            </Badge>
          )}
        </div>

        <Textarea
          value={questionValue}
          onChange={handleQuestionChange}
          disabled={disabled}
          placeholder='Enter question with {{blank}} placeholders…'
          rows={4}
          className="min-h-[120px]"
          aria-label="Fill-in-the-blanks question"
        />

        <p className="text-xs text-text-muted mt-1">{HINT_TEXT}</p>
      </section>

      {/* ── 2. Answers Section ── */}
      {blankCount > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-text-muted" />
            <span className="text-sm font-semibold text-text-primary">
              Answers
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: blankCount }, (_, i) => (
              <Input
                key={`answer-${i}`}
                id={`fill-blank-answer-${i}`}
                label={`Answer for blank ${i + 1}:`}
                value={answersValue[i] ?? ""}
                onChange={(e) => handleAnswerChange(i, e.target.value)}
                disabled={disabled}
                placeholder={`Blank ${i + 1} answer`}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── 3. Preview Section ── */}
      {questionValue.trim().length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-text-muted" />
            <span className="text-sm font-semibold text-text-primary">
              Preview
            </span>
          </div>

          <div
            className={cn(
              "rounded-lg border border-border-default bg-bg-subtle/30 p-4",
              "text-sm leading-relaxed text-text-primary",
            )}
            role="region"
            aria-label="Question preview"
          >
            {previewSegments.map((segment, segIdx) => {
              if (segment.type === "text") {
                return (
                  <span key={`seg-${segIdx}`}>
                    {segment.value}
                  </span>
                );
              }
              return renderPreviewBlank(segment.index);
            })}

            {blankCount === 0 && questionValue.trim().length > 0 && (
              <p className="text-xs text-text-muted italic mt-2">
                No blanks detected. Add {"{{blank}}"} to create fill-in
                positions.
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

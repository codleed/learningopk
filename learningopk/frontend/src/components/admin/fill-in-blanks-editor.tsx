"use client";

import { useCallback, type ChangeEvent, type ReactNode } from "react";
import { Plus, Trash2, Eye, TextCursorInput, CheckCircle } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ─── Constants ─── */

const BLANK_PATTERN = /\{\{blank\}\}/g;
const HINT_TEXT =
  "Use {{blank}} to mark fill-in positions. Example: The force is {{blank}} Newtons.";

/* ─── Types ─── */

export type BlankStatement = {
  text: string;
  blanksAnswer: string[];
};

type FillInBlanksEditorProps = {
  statementsValue: BlankStatement[];
  onStatementsChange: (statements: BlankStatement[]) => void;
  disabled?: boolean;
  className?: string;
};

/* ─── Helpers ─── */

function countBlanks(text: string): number {
  const matches = text.match(BLANK_PATTERN);
  return matches ? matches.length : 0;
}

type PreviewSegment =
  | { type: "text"; value: string }
  | { type: "blank"; index: number };

function parseSegments(text: string): PreviewSegment[] {
  const parts = text.split(BLANK_PATTERN);
  const segments: PreviewSegment[] = [];
  let blankIdx = 0;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part !== undefined && part.length > 0) {
      segments.push({ type: "text", value: part });
    }
    if (i < parts.length - 1) {
      segments.push({ type: "blank", index: blankIdx });
      blankIdx++;
    }
  }

  return segments;
}

function createEmptyStatement(): BlankStatement {
  return { text: "", blanksAnswer: [] };
}

/* ─── Component ─── */

export function FillInBlanksEditor({
  statementsValue,
  onStatementsChange,
  disabled = false,
  className,
}: FillInBlanksEditorProps) {
  /* ── Handlers ── */

  const handleAddStatement = useCallback(() => {
    onStatementsChange([...statementsValue, createEmptyStatement()]);
  }, [statementsValue, onStatementsChange]);

  const handleRemoveStatement = useCallback(
    (index: number) => {
      onStatementsChange(statementsValue.filter((_, i) => i !== index));
    },
    [statementsValue, onStatementsChange]
  );

  const handleStatementTextChange = useCallback(
    (index: number, value: string) => {
      const updated = statementsValue.map((stmt, i) => {
        if (i !== index) return stmt;
        const nextCount = countBlanks(value);
        const synced: string[] = Array.from({ length: nextCount }, (_, j) =>
          j < stmt.blanksAnswer.length ? (stmt.blanksAnswer[j] ?? "") : ""
        );
        return { ...stmt, text: value, blanksAnswer: synced };
      });
      onStatementsChange(updated);
    },
    [statementsValue, onStatementsChange]
  );

  const handleStatementAnswerChange = useCallback(
    (stmtIndex: number, blankIndex: number, value: string) => {
      const updated = statementsValue.map((stmt, i) => {
        if (i !== stmtIndex) return stmt;
        const newAnswers = stmt.blanksAnswer.map((v, j) =>
          j === blankIndex ? value : v
        );
        return { ...stmt, blanksAnswer: newAnswers };
      });
      onStatementsChange(updated);
    },
    [statementsValue, onStatementsChange]
  );

  /* ── Render helpers ── */

  const renderPreviewBlank = (answer: string): ReactNode => {
    const hasAnswer = answer.trim().length > 0;

    return (
      <span className="inline-flex flex-col items-center mx-1">
        <span
          className={cn(
            "inline-block border-b-2 border-accent-primary min-w-[80px] text-center",
            "px-2 py-0.5 text-sm font-medium",
            hasAnswer ? "text-text-primary" : "text-text-muted"
          )}
        >
          {hasAnswer ? answer : "_______"}
        </span>
      </span>
    );
  };

  /* ── JSX ── */

  const totalBlanks = statementsValue.reduce(
    (sum, s) => sum + s.blanksAnswer.length,
    0
  );

  return (
    <div className={cn("space-y-5", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TextCursorInput className="h-4 w-4 text-text-muted" />
          <span className="text-sm font-semibold text-text-primary">
            Statements
          </span>
          {totalBlanks > 0 && (
            <Badge variant="primary" size="sm">
              {totalBlanks} {totalBlanks === 1 ? "blank" : "blanks"} across{" "}
              {statementsValue.length}{" "}
              {statementsValue.length === 1 ? "statement" : "statements"}
            </Badge>
          )}
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleAddStatement}
          disabled={disabled}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Statement
        </Button>
      </div>

      {/* Statements list */}
      {statementsValue.length === 0 && (
        <div className="rounded-lg border border-dashed border-border-default bg-bg-subtle/5 p-6 text-center">
          <p className="text-sm text-text-secondary mb-3">
            No statements yet. Click &quot;Add Statement&quot; to create one.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={handleAddStatement}
            disabled={disabled}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Statement
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {statementsValue.map((statement, stmtIdx) => {
          const blankCount = statement.blanksAnswer.length;
          const segments = parseSegments(statement.text);

          return (
            <div
              key={stmtIdx}
              className="rounded-lg border border-border-default bg-bg-surface p-4 space-y-3"
            >
              {/* Statement header */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-muted">
                  Statement {stmtIdx + 1}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveStatement(stmtIdx)}
                  disabled={disabled}
                  className="h-7 w-7 p-0 text-text-muted hover:text-accent-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Statement text */}
              <Textarea
                value={statement.text}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                  handleStatementTextChange(stmtIdx, e.target.value)
                }
                disabled={disabled}
                placeholder='Enter statement with {{blank}} placeholders…'
                rows={2}
                className="min-h-[60px]"
                aria-label={`Statement ${stmtIdx + 1} text`}
              />

              {/* Answers for each blank */}
              {blankCount > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-text-muted" />
                    <span className="text-xs font-medium text-text-secondary">
                      Answers
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {statement.blanksAnswer.map((answer, blankIdx) => (
                      <Input
                        key={`stmt-${stmtIdx}-blank-${blankIdx}`}
                        id={`stmt-${stmtIdx}-blank-${blankIdx}`}
                        label={`Blank ${blankIdx + 1}:`}
                        value={answer}
                        onChange={(e) =>
                          handleStatementAnswerChange(
                            stmtIdx,
                            blankIdx,
                            e.target.value
                          )
                        }
                        disabled={disabled}
                        placeholder={`Answer for blank ${blankIdx + 1}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Live preview */}
              {statement.text.trim().length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5 text-text-muted" />
                    <span className="text-xs text-text-muted">Preview</span>
                  </div>
                  <div
                    className={cn(
                      "rounded-md border border-border-default bg-bg-subtle/30 p-3",
                      "text-sm leading-relaxed text-text-primary"
                    )}
                    role="region"
                    aria-label={`Statement ${stmtIdx + 1} preview`}
                  >
                    {blankCount === 0 ? (
                      <p className="text-xs text-text-muted italic">
                        No blanks detected. Add {"{{blank}}"} to create fill-in
                        positions.
                      </p>
                    ) : (
                      <p className="flex flex-wrap items-baseline gap-y-2">
                        {segments.map((segment, segIdx) => {
                          if (segment.type === "text") {
                            return (
                              <span key={`seg-${segIdx}`}>
                                {segment.value}
                              </span>
                            );
                          }
                          return renderPreviewBlank(
                            statement.blanksAnswer[segment.index] ?? ""
                          );
                        })}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-text-muted">{HINT_TEXT}</p>
    </div>
  );
}

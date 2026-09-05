"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Pencil, Trash2, Loader2, TextCursorInput, X, CheckCircle, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  getAdminCurriculumExercises,
  createAdminCurriculumExercise,
  updateAdminCurriculumExercise,
  deleteAdminCurriculumExercise,
} from "@/lib/admin-api";
import type { AdminCurriculumExerciseRead } from "@/lib/admin-api";
import { cn } from "@/lib/utils";

/* ─── Constants ─── */

const BLANK_PATTERN = /\{\{blank\}\}/g;

type ChapterFillInBlanksManagerProps = {
  chapterId: number;
};

type StatementFormData = {
  exerciseNumber: string;
  question: string;
  blanksAnswer: string[];
  difficulty: "easy" | "medium" | "hard";
};

const initialFormData: StatementFormData = {
  exerciseNumber: "",
  question: "",
  blanksAnswer: [],
  difficulty: "medium",
};

/* ─── Helpers ─── */

function countBlanks(text: string): number {
  const matches = text.match(BLANK_PATTERN);
  return matches ? matches.length : 0;
}

type PreviewSegment = { type: "text"; value: string } | { type: "blank"; index: number };

function parseSegments(question: string): PreviewSegment[] {
  const parts = question.split(BLANK_PATTERN);
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

/* ─── Component ─── */

export function ChapterFillInBlanksManager({ chapterId }: ChapterFillInBlanksManagerProps) {
  const { pushToast } = useToast();
  const [statements, setStatements] = useState<AdminCurriculumExerciseRead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingStatement, setEditingStatement] = useState<AdminCurriculumExerciseRead | null>(
    null
  );
  const [formData, setFormData] = useState<StatementFormData>(initialFormData);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    id?: number;
  }>({ show: false });

  /* ── Data fetching ── */

  const fetchStatements = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getAdminCurriculumExercises({ chapterId });
      // Filter to only fill_in_blanks type
      setStatements(data.exercises.filter((e) => e.type === "fill_in_blanks"));
    } catch (error) {
      console.error("Failed to fetch fill-in-the-blank statements:", error);
      pushToast({
        title: "Failed to load statements",
        description: "Please try again or contact support.",
        tone: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [chapterId, pushToast]);

  useEffect(() => {
    fetchStatements();
  }, [fetchStatements]);

  /* ── Derived state ── */

  const blankCount = useMemo(() => countBlanks(formData.question), [formData.question]);

  const previewSegments = useMemo(() => parseSegments(formData.question), [formData.question]);

  const nextExerciseNumber = useMemo(() => {
    if (statements.length === 0) return "1";
    const maxNum = Math.max(
      ...statements.map((s) => {
        const n = parseInt(s.exerciseNumber, 10);
        return isNaN(n) ? 0 : n;
      })
    );
    return String(maxNum + 1);
  }, [statements]);

  /* ── Handlers ── */

  const handleQuestionChange = useCallback((value: string) => {
    setFormData((prev) => {
      const nextCount = countBlanks(value);
      const synced: string[] = Array.from({ length: nextCount }, (_, i) =>
        i < prev.blanksAnswer.length ? (prev.blanksAnswer[i] ?? "") : ""
      );
      return { ...prev, question: value, blanksAnswer: synced };
    });
  }, []);

  const handleAnswerChange = useCallback((index: number, value: string) => {
    setFormData((prev) => {
      const updated = prev.blanksAnswer.map((v, i) => (i === index ? value : v));
      return { ...prev, blanksAnswer: updated };
    });
  }, []);

  const handleSave = async () => {
    if (!formData.question.trim()) {
      pushToast({
        title: "Validation Error",
        description: "Statement text is required.",
        tone: "error",
      });
      return;
    }
    if (blankCount === 0) {
      pushToast({
        title: "Validation Error",
        description: "No blanks detected. Use {{blank}} to mark fill-in positions.",
        tone: "error",
      });
      return;
    }
    if (formData.blanksAnswer.some((a) => !a.trim())) {
      pushToast({
        title: "Validation Error",
        description: "All blank answers must be filled in.",
        tone: "error",
      });
      return;
    }

    setIsSaving(true);
    try {
      const exerciseNumber = formData.exerciseNumber.trim() || nextExerciseNumber;

      if (editingStatement) {
        const updated = await updateAdminCurriculumExercise({
          exerciseId: editingStatement.id,
          exerciseNumber,
          question: formData.question,
          solution: formData.blanksAnswer.join(", "),
          difficulty: formData.difficulty,
          type: "fill_in_blanks",
          blanksAnswer: formData.blanksAnswer,
        });
        setStatements((prev) =>
          prev.map((s) => (s.id === editingStatement.id ? { ...s, ...updated.exercise } : s))
        );
        pushToast({ title: "Statement updated", tone: "success" });
      } else {
        const created = await createAdminCurriculumExercise({
          chapterId,
          exerciseNumber,
          question: formData.question,
          solution: formData.blanksAnswer.join(", "),
          difficulty: formData.difficulty,
          type: "fill_in_blanks",
          blanksAnswer: formData.blanksAnswer,
        });
        setStatements((prev) => [
          ...prev,
          { ...created.exercise, chapterTitle: "", subjectName: "" },
        ]);
        pushToast({ title: "Statement added", tone: "success" });
      }
      resetForm();
    } catch (error: unknown) {
      console.error("Failed to save statement:", error);
      const err = error as { response?: { status?: number } };
      if (err?.response?.status === 409) {
        pushToast({
          title: "Statement already exists",
          description: "A statement with this number already exists for this chapter.",
          tone: "error",
        });
      } else {
        pushToast({ title: "Failed to save statement", tone: "error" });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (statement: AdminCurriculumExerciseRead) => {
    setEditingStatement(statement);
    setFormData({
      exerciseNumber: statement.exerciseNumber,
      question: statement.question,
      blanksAnswer: statement.blanksAnswer || [],
      difficulty: statement.difficulty,
    });
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirm.id) return;
    try {
      await deleteAdminCurriculumExercise(deleteConfirm.id);
      setStatements((prev) => prev.filter((s) => s.id !== deleteConfirm.id));
      pushToast({ title: "Statement deleted", tone: "success" });
    } catch (error) {
      console.error("Failed to delete statement:", error);
      pushToast({ title: "Failed to delete statement", tone: "error" });
    } finally {
      setDeleteConfirm({ show: false });
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingStatement(null);
    setShowForm(false);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-emerald-500";
      case "medium":
        return "bg-amber-500";
      case "hard":
        return "bg-rose-500";
      default:
        return "bg-bg-subtle";
    }
  };

  /* ── Loading state ── */

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  /* ── Render ── */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-gradient-to-b from-violet-500 to-violet-600 rounded-full" />
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Fill in the Blanks</h2>
            <p className="text-sm text-text-secondary">
              {statements.length} {statements.length === 1 ? "statement" : "statements"}
            </p>
          </div>
        </div>
        {!showForm && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              resetForm();
              setFormData((prev) => ({
                ...prev,
                exerciseNumber: nextExerciseNumber,
              }));
              setShowForm(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Statement
          </Button>
        )}
      </div>

      {/* Add/Edit Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-violet-500/20 bg-bg-surface shadow-sm overflow-hidden">
              <div className="p-6 space-y-5">
                {/* Form header */}
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2">
                    <TextCursorInput className="h-4 w-4 text-violet-500" />
                    {editingStatement ? "Edit Statement" : "Add New Statement"}
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetForm}
                    className="text-text-secondary"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Metadata row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Statement Number</label>
                    <Input
                      value={formData.exerciseNumber}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          exerciseNumber: e.target.value,
                        }))
                      }
                      placeholder="Auto-assigned if empty"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Difficulty</label>
                    <Select
                      value={formData.difficulty}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          difficulty: e.target.value as "easy" | "medium" | "hard",
                        }))
                      }
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </Select>
                  </div>
                </div>

                {/* Statement text */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    Statement <span className="text-accent-danger">*</span>
                    {blankCount > 0 && (
                      <Badge variant="primary" size="sm">
                        {blankCount} {blankCount === 1 ? "blank" : "blanks"}
                      </Badge>
                    )}
                  </label>
                  <Textarea
                    value={formData.question}
                    onChange={(e) => handleQuestionChange(e.target.value)}
                    placeholder="Type the statement using {{blank}} to mark blanks. Example: The force of gravity is {{blank}} m/s²."
                    rows={3}
                    className="min-h-[80px]"
                  />
                  <p className="text-xs text-text-muted">
                    Use{" "}
                    <code className="px-1 py-0.5 rounded bg-bg-subtle text-xs font-mono">
                      {"{{blank}}"}
                    </code>{" "}
                    to mark fill-in positions. Supports LaTeX: wrap math in{" "}
                    <code className="px-1 py-0.5 rounded bg-bg-subtle text-xs font-mono">
                      $...$
                    </code>
                  </p>
                </div>

                {/* Answers for each blank */}
                {blankCount > 0 && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      Correct Answers
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Array.from({ length: blankCount }, (_, i) => (
                        <div key={`answer-${i}`} className="space-y-1">
                          <label className="text-xs text-text-muted">Blank {i + 1}</label>
                          <Input
                            value={formData.blanksAnswer[i] ?? ""}
                            onChange={(e) => handleAnswerChange(i, e.target.value)}
                            placeholder={`Answer for blank ${i + 1}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Live Preview */}
                {formData.question.trim().length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-text-muted" />
                      <span className="text-sm font-medium text-text-primary">Student Preview</span>
                    </div>
                    <div className="rounded-lg border border-border-default bg-bg-subtle/30 p-4 text-sm leading-relaxed">
                      <p className="flex flex-wrap items-baseline gap-y-2">
                        {previewSegments.map((segment, segIdx) => {
                          if (segment.type === "text") {
                            return <span key={`seg-${segIdx}`}>{segment.value}</span>;
                          }
                          const answer = formData.blanksAnswer[segment.index] ?? "";
                          const hasAnswer = answer.trim().length > 0;
                          return (
                            <span
                              key={`blank-${segment.index}`}
                              className="relative mx-1 inline-flex flex-col items-center"
                            >
                              <span
                                className={cn(
                                  "inline-block border-b-2 border-violet-500 min-w-[80px] text-center",
                                  "px-2 py-0.5 text-sm font-medium",
                                  hasAnswer ? "text-text-primary" : "text-text-muted"
                                )}
                              >
                                {hasAnswer ? answer : "_______"}
                              </span>
                              {hasAnswer && (
                                <span className="text-xs text-emerald-500 mt-0.5 font-medium">
                                  {answer}
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </p>
                      {blankCount === 0 && formData.question.trim().length > 0 && (
                        <p className="text-xs text-text-muted italic mt-2">
                          No blanks detected. Add {"{{blank}}"} to create fill-in positions.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Form actions */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 bg-bg-subtle/5 border-t">
                <Button variant="secondary" onClick={resetForm}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : editingStatement ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Update Statement
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Add Statement
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Statements List */}
      {statements.length === 0 && !showForm ? (
        <div className="relative overflow-hidden rounded-xl border border-dashed border-border-default bg-bg-subtle/5">
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="rounded-full bg-violet-500/10 p-4 mb-4">
              <TextCursorInput className="h-10 w-10 text-violet-500/60" />
            </div>
            <h3 className="text-lg font-medium mb-1">No statements yet</h3>
            <p className="text-sm text-text-secondary max-w-xs mb-6">
              Create fill-in-the-blank statements to help students practice recall and
              understanding.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                resetForm();
                setFormData((prev) => ({
                  ...prev,
                  exerciseNumber: nextExerciseNumber,
                }));
                setShowForm(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Create First Statement
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {statements.map((statement, idx) => {
              const segments = parseSegments(statement.question);
              const answers = statement.blanksAnswer || [];

              return (
                <motion.div
                  key={statement.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20, scale: 0.95 }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 30,
                    delay: idx * 0.03,
                  }}
                  className="group rounded-xl border bg-bg-surface shadow-sm overflow-hidden transition-all hover:shadow-md hover:border-violet-500/20"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Meta badges */}
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-violet-500/10 text-violet-600 font-mono font-semibold text-sm">
                            {statement.exerciseNumber}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <div
                              className={cn(
                                "w-2 h-2 rounded-full",
                                getDifficultyColor(statement.difficulty)
                              )}
                            />
                            <span className="text-xs text-text-secondary capitalize">
                              {statement.difficulty}
                            </span>
                          </div>
                          <Badge variant="info" size="sm">
                            {answers.length} {answers.length === 1 ? "blank" : "blanks"}
                          </Badge>
                        </div>

                        {/* Statement preview with inline blanks */}
                        <div className="text-sm leading-relaxed text-text-primary">
                          <p className="flex flex-wrap items-baseline gap-y-1">
                            {segments.map((segment, segIdx) => {
                              if (segment.type === "text") {
                                return <span key={`seg-${segIdx}`}>{segment.value}</span>;
                              }
                              const answer = answers[segment.index] ?? "";
                              return (
                                <span
                                  key={`blank-${segment.index}`}
                                  className="mx-1 inline-flex items-center"
                                >
                                  <span className="inline-block border-b-2 border-violet-500 bg-violet-500/5 rounded-sm px-2 py-0.5 text-sm font-semibold text-violet-600 min-w-[60px] text-center">
                                    {answer || "_______"}
                                  </span>
                                </span>
                              );
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(statement)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setDeleteConfirm({
                              show: true,
                              id: statement.id,
                            })
                          }
                          className="text-accent-danger hover:text-accent-danger"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteConfirm.show}
        title="Delete Statement?"
        description="This fill-in-the-blank statement will be permanently removed. This action cannot be undone."
        confirmLabel="Delete"
        danger
        isPending={isSaving}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ show: false })}
      />
    </div>
  );
}

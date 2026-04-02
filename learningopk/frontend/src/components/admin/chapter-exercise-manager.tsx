"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Plus, Pencil, Trash2, Loader2, Brain, Filter, 
  X, CheckCircle, Code, Hash, AlignLeft, ListChecks, Binary, TextCursorInput
} from "lucide-react";

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
import { NumericalVisualizationEditor } from "@/components/admin/numerical-visualization-editor";
import { FillInBlanksEditor } from "@/components/admin/fill-in-blanks-editor";

type ExerciseType = "all" | "mcq" | "short" | "long" | "numerical" | "fill_in_blanks";

type ChapterExerciseManagerProps = {
  chapterId: number;
};

type ExerciseFormData = {
  exerciseNumber: string;
  question: string;
  solution: string;
  difficulty: "easy" | "medium" | "hard";
  type: "mcq" | "short" | "long" | "numerical" | "fill_in_blanks";
  problemMarkdown: string;
  solutionCode: string;
  visualizationHtml: string;
  blanksAnswer: string[];
};

const initialFormData: ExerciseFormData = {
  exerciseNumber: "",
  question: "",
  solution: "",
  difficulty: "medium",
  type: "short",
  problemMarkdown: "",
  solutionCode: "",
  visualizationHtml: "",
  blanksAnswer: [],
};

const typeFilters: { id: ExerciseType; label: string; icon: typeof Brain }[] = [
  { id: "all", label: "All", icon: ListChecks },
  { id: "short", label: "Short", icon: AlignLeft },
  { id: "mcq", label: "MCQ", icon: ListChecks },
  { id: "long", label: "Long", icon: AlignLeft },
  { id: "numerical", label: "Numerical", icon: Hash },
  { id: "fill_in_blanks", label: "Fill Blanks", icon: TextCursorInput },
];

const exerciseTypeIcons: Record<string, typeof Brain> = {
  short: AlignLeft,
  mcq: ListChecks,
  long: AlignLeft,
  numerical: Hash,
  fill_in_blanks: TextCursorInput,
};

export function ChapterExerciseManager({ chapterId }: ChapterExerciseManagerProps) {
  const { pushToast } = useToast();
  const [exercises, setExercises] = useState<AdminCurriculumExerciseRead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingExercise, setEditingExercise] = useState<AdminCurriculumExerciseRead | null>(null);
  const [typeFilter, setTypeFilter] = useState<ExerciseType>("all");
  const [formData, setFormData] = useState<ExerciseFormData>(initialFormData);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id?: number }>({ show: false });

  const fetchExercises = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getAdminCurriculumExercises({ chapterId });
      setExercises(data.exercises);
    } catch (error) {
      console.error("Failed to fetch exercises:", error);
      pushToast({
        title: "Failed to load exercises",
        description: "Please try again or contact support.",
        tone: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [chapterId, pushToast]);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  const filteredExercises =
    typeFilter === "all" ? exercises : exercises.filter((e) => e.type === typeFilter);

  const handleSave = async () => {
    if (!formData.exerciseNumber.trim() || !formData.question.trim() || !formData.solution.trim()) {
      pushToast({
        title: "Validation Error",
        description: "Exercise number, question, and solution are required",
        tone: "error",
      });
      return;
    }
    setIsSaving(true);
    try {
      if (editingExercise) {
        const updated = await updateAdminCurriculumExercise({
          exerciseId: editingExercise.id,
          exerciseNumber: formData.exerciseNumber,
          question: formData.question,
          solution: formData.solution,
          difficulty: formData.difficulty,
          type: formData.type,
          visualizationHtml: formData.type === "numerical" ? formData.visualizationHtml || undefined : undefined,
          blanksAnswer: formData.type === "fill_in_blanks" ? formData.blanksAnswer : undefined,
        });
        setExercises((prev) =>
          prev.map((e) => (e.id === editingExercise.id ? { ...e, ...updated.exercise } : e))
        );
        pushToast({
          title: "Exercise updated",
          tone: "success",
        });
      } else {
        const created = await createAdminCurriculumExercise({
          chapterId,
          exerciseNumber: formData.exerciseNumber,
          question: formData.question,
          solution: formData.solution,
          difficulty: formData.difficulty,
          type: formData.type,
          problemMarkdown: formData.type === "numerical" ? formData.problemMarkdown : undefined,
          solutionCode: formData.type === "numerical" ? formData.solutionCode : undefined,
          visualizationHtml: formData.type === "numerical" ? formData.visualizationHtml || undefined : undefined,
          blanksAnswer: formData.type === "fill_in_blanks" ? formData.blanksAnswer : undefined,
        });
        setExercises((prev) => [
          ...prev,
          {
            ...created.exercise,
            chapterTitle: "",
            subjectName: "",
          },
        ]);
        pushToast({
          title: "Exercise added",
          tone: "success",
        });
      }
      resetForm();
    } catch (error: unknown) {
      console.error("Failed to save exercise:", error);
      // Handle 409 Conflict - exercise already exists for chapter
      const err = error as { response?: { status?: number } };
      if (err?.response?.status === 409) {
        pushToast({
          title: "Exercise already exists",
          description: "An exercise with this number already exists for this chapter.",
          tone: "error",
        });
      } else {
        pushToast({
          title: "Failed to save exercise",
          tone: "error",
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (exercise: AdminCurriculumExerciseRead) => {
    setEditingExercise(exercise);
    setFormData({
      exerciseNumber: exercise.exerciseNumber,
      question: exercise.question,
      solution: exercise.solution,
      difficulty: exercise.difficulty,
      type: exercise.type,
      problemMarkdown: exercise.problemMarkdown || "",
      solutionCode: exercise.solutionCode || "",
      visualizationHtml: exercise.visualizationHtml || "",
      blanksAnswer: exercise.blanksAnswer || [],
    });
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirm.id) return;
    try {
      await deleteAdminCurriculumExercise(deleteConfirm.id);
      setExercises((prev) => prev.filter((e) => e.id !== deleteConfirm.id));
      pushToast({
        title: "Exercise deleted",
        tone: "success",
      });
    } catch (error) {
      console.error("Failed to delete exercise:", error);
      pushToast({
        title: "Failed to delete exercise",
        tone: "error",
      });
    } finally {
      setDeleteConfirm({ show: false });
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingExercise(null);
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
        return "bg-muted";
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "short":
        return "info";
      case "mcq":
        return "success";
      case "long":
        return "warning";
      case "numerical":
        return "neutral";
      case "fill_in_blanks":
        return "info";
      default:
        return "neutral";
    }
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-8 w-20" />
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-gradient-to-b from-[var(--primary)] to-[var(--primary-hover)] rounded-full" />
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Exercises</h2>
            <p className="text-sm text-muted-foreground">
              {filteredExercises.length} {filteredExercises.length === 1 ? "exercise" : "exercises"}
              {typeFilter !== "all" && ` (${typeFilter} only)`}
            </p>
          </div>
        </div>
        {!showForm && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Exercise
          </Button>
        )}
      </div>

      {/* Type Filter Pills */}
      {!showForm && (
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground mr-1">Filter:</span>
          {typeFilters.map((filter) => {
            const Icon = filter.icon;
            const isActive = typeFilter === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => setTypeFilter(filter.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200",
                  isActive
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {filter.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden animate-in slide-in-from-top duration-300">
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                {editingExercise ? "Edit Exercise" : "Add New Exercise"}
                {editingExercise && (
                  <Badge variant={getTypeBadgeVariant(editingExercise.type)} className="text-xs">
                    {editingExercise.type}
                  </Badge>
                )}
              </h4>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={resetForm}
                className="text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Exercise Type & Difficulty Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Exercise Number <span className="text-destructive">*</span>
                </label>
                <Input
                  value={formData.exerciseNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, exerciseNumber: e.target.value }))}
                  placeholder="e.g., 1, 2, Q1"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    type: e.target.value as "mcq" | "short" | "long" | "numerical" | "fill_in_blanks"
                  }))}
                >
                  <option value="short">Short Answer</option>
                  <option value="mcq">MCQ</option>
                  <option value="long">Long Answer</option>
                  <option value="numerical">Numerical</option>
                  <option value="fill_in_blanks">Fill in the Blanks</option>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Difficulty</label>
                <Select
                  value={formData.difficulty}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    difficulty: e.target.value as "easy" | "medium" | "hard" 
                  }))}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </Select>
              </div>
            </div>

            {/* Question & Solution */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  Question <span className="text-destructive">*</span>
                </label>
                <Textarea
                  value={formData.question}
                  onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))}
                  placeholder="Enter the exercise question..."
                  rows={3}
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  Solution <span className="text-destructive">*</span>
                </label>
                <Textarea
                  value={formData.solution}
                  onChange={(e) => setFormData(prev => ({ ...prev, solution: e.target.value }))}
                  placeholder="Enter the solution..."
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>

            {/* Numerical type specific fields */}
            {formData.type === "numerical" && (
              <div className="space-y-4 p-4 rounded-lg bg-muted/30 border border-border">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Code className="h-4 w-4" />
                  Numerical Options
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Problem Markdown (optional)</label>
                  <Textarea
                    value={formData.problemMarkdown}
                    onChange={(e) => setFormData(prev => ({ ...prev, problemMarkdown: e.target.value }))}
                    placeholder="Additional markdown for mathematical problems..."
                    rows={2}
                    className="resize-none font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Solution Code (optional)</label>
                  <Textarea
                    value={formData.solutionCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, solutionCode: e.target.value }))}
                    placeholder="Code solution if applicable..."
                    rows={2}
                    className="resize-none font-mono text-sm bg-muted/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Interactive Visualization (optional)</label>
                  <p className="text-xs text-muted-foreground">
                    Create an HTML/CSS/JS visualization that students can interact with
                  </p>
                  <NumericalVisualizationEditor
                    value={formData.visualizationHtml}
                    onChange={(value) => setFormData(prev => ({ ...prev, visualizationHtml: value }))}
                  />
                </div>
              </div>
            )}

            {/* Fill in the blanks type specific fields */}
            {formData.type === "fill_in_blanks" && (
              <div className="space-y-4 p-4 rounded-lg bg-muted/30 border border-border">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <TextCursorInput className="h-4 w-4" />
                  Fill in the Blanks
                </div>
                <FillInBlanksEditor
                  questionValue={formData.question}
                  onQuestionChange={(value) => setFormData(prev => ({ ...prev, question: value }))}
                  answersValue={formData.blanksAnswer}
                  onAnswersChange={(answers) => setFormData(prev => ({ ...prev, blanksAnswer: answers }))}
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-muted/5 border-t">
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
              ) : editingExercise ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Update Exercise
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add Exercise
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Exercises List */}
      {filteredExercises.length === 0 && !showForm ? (
        <div className="relative overflow-hidden rounded-xl border border-dashed border-border bg-muted/5">
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="rounded-full bg-muted/20 p-4 mb-4">
              <Brain className="h-10 w-10 text-muted-foreground/60" />
            </div>
            <h3 className="text-lg font-medium mb-1">
              {typeFilter === "all" ? "No exercises yet" : `No ${typeFilter} exercises found`}
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs mb-6">
              {typeFilter === "all"
                ? "Add exercises to help students practice and master chapter concepts"
                : "Try a different filter or add a new exercise"}
            </p>
            {typeFilter === "all" ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Create First Exercise
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setTypeFilter("all")}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                Show All
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredExercises.map((exercise) => {
            const TypeIcon = exerciseTypeIcons[exercise.type] || AlignLeft;
            return (
              <div 
                key={exercise.id}
                className="group rounded-xl border bg-card shadow-sm overflow-hidden transition-all hover:shadow-md hover:border-[var(--primary)]/20"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Meta badges */}
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        {/* Exercise Number */}
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] font-mono font-semibold text-sm">
                          {exercise.exerciseNumber}
                        </span>
                        
                        {/* Type Badge */}
                        <Badge variant={getTypeBadgeVariant(exercise.type)} className="gap-1">
                          <TypeIcon className="h-3 w-3" />
                          {exercise.type.toUpperCase()}
                        </Badge>

                        {/* Difficulty Indicator */}
                        <div className="flex items-center gap-1.5">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            getDifficultyColor(exercise.difficulty)
                          )} />
                          <span className="text-xs text-muted-foreground capitalize">
                            {exercise.difficulty}
                          </span>
                        </div>
                      </div>

                      {/* Question */}
                      <p className="text-sm font-medium mb-3 leading-relaxed">
                        {exercise.question}
                      </p>

                      {/* Solution Preview */}
                      <div className="p-3 rounded-lg bg-muted/30 border border-border">
                        <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Solution
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {exercise.solution.length > 150 
                            ? `${exercise.solution.substring(0, 150)}...`
                            : exercise.solution}
                        </p>
                      </div>

                      {/* Numerical-specific fields */}
                      {exercise.type === "numerical" && (exercise.problemMarkdown || exercise.solutionCode) && (
                        <div className="mt-3 flex flex-wrap gap-3">
                          {exercise.problemMarkdown && (
                            <div className="flex-1 min-w-[200px] p-3 rounded-lg bg-muted/30 border border-border">
                              <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                <Code className="h-3 w-3" />
                                Problem Markdown
                              </p>
                              <p className="text-xs font-mono truncate">
                                {exercise.problemMarkdown}
                              </p>
                            </div>
                          )}
                          {exercise.solutionCode && (
                            <div className="flex-1 min-w-[200px] p-3 rounded-lg bg-muted/50 border border-border">
                              <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                <Binary className="h-3 w-3" />
                                Solution Code
                              </p>
                              <p className="text-xs font-mono truncate">
                                {exercise.solutionCode}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleEdit(exercise)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setDeleteConfirm({ show: true, id: exercise.id })}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirm.show}
        title="Delete Exercise?"
        description="This exercise will be permanently removed. This action cannot be undone."
        confirmLabel="Delete"
        danger
        isPending={isSaving}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ show: false })}
      />
    </div>
  );
}

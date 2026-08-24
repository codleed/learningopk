"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Pencil, Trash2, Loader2, Brain, Filter,
  X, CheckCircle, FileText, MessageSquare, TextCursorInput, Atom,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  ExerciseSectionCard,
  ExerciseSectionHeader,
  ExerciseSectionBody,
  ExerciseTypeTabs,
  SECTION_TO_API_TYPE,
  API_TYPE_TO_SECTION,
  SECTION_META,
  panelVariants,
  panelTransition,
} from "@/components/admin";
import type { ExerciseSectionType } from "@/components/admin";
import {
  getAdminCurriculumExercises,
  createAdminCurriculumExercise,
  updateAdminCurriculumExercise,
  deleteAdminCurriculumExercise,
  uploadAdminChapterSummaryMedia,
} from "@/lib/admin-api";
import type { AdminCurriculumExerciseRead } from "@/lib/admin-api";
import { cn } from "@/lib/utils";
import { NumericalVisualizationEditor } from "@/components/admin/numerical-visualization-editor";
import { FillInBlanksEditor } from "@/components/admin/fill-in-blanks-editor";
import type { BlankStatement } from "@/components/admin/fill-in-blanks-editor";
import { GithubMarkdownEditor } from "@/components/admin/github-markdown-editor";
import { MarkdownMathRenderer } from "@/components/learn/markdown-math-renderer";

type ExerciseFilterType = "all" | "short" | "long" | "numerical" | "fill_in_blanks";

type ChapterExerciseManagerProps = {
  chapterId: number;
};

type ExerciseFormData = {
  exerciseNumber: string;
  question: string;
  solution: string;
  difficulty: "easy" | "medium" | "hard";
  visualizationHtml: string;
  blanksAnswer: string[];
  statements: BlankStatement[];
};

const initialFormData: ExerciseFormData = {
  exerciseNumber: "",
  question: "",
  solution: "",
  difficulty: "medium",
  visualizationHtml: "",
  blanksAnswer: [],
  statements: [],
};

const typeFilters: { id: ExerciseFilterType; label: string; icon: typeof Brain }[] = [
  { id: "all", label: "All", icon: Brain },
  { id: "short", label: "Short", icon: MessageSquare },
  { id: "long", label: "Long", icon: FileText },
  { id: "numerical", label: "Physics", icon: Atom },
  { id: "fill_in_blanks", label: "Fill Blanks", icon: TextCursorInput },
];

export function ChapterExerciseManager({ chapterId }: ChapterExerciseManagerProps) {
  const { pushToast } = useToast();
  const [exercises, setExercises] = useState<AdminCurriculumExerciseRead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingExercise, setEditingExercise] = useState<AdminCurriculumExerciseRead | null>(null);
  const [typeFilter, setTypeFilter] = useState<ExerciseFilterType>("all");
  const [formData, setFormData] = useState<ExerciseFormData>(initialFormData);
  const [activeSection, setActiveSection] = useState<ExerciseSectionType>("long");
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
    const timeoutId = window.setTimeout(() => {
      void fetchExercises();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchExercises]);

  /* ── Image upload handler ── */

  const handleImageUpload = useMemo(() => {
    return async (file: File) => {
      try {
        const response = await uploadAdminChapterSummaryMedia({
          chapterId,
          file,
        });
        return {
          url: response.asset.objectUrl,
          markdown: response.markdown,
        };
      } catch (error) {
        pushToast({
          title: "Upload failed",
          description: error instanceof Error ? error.message : "Failed to upload image",
          tone: "error",
        });
        throw error;
      }
    };
  }, [chapterId, pushToast]);

  /* ── Derived ── */

  const apiType = SECTION_TO_API_TYPE[activeSection];

  const filteredExercises =
    typeFilter === "all" ? exercises : exercises.filter((e) => e.type === typeFilter);

  const handleSave = async () => {
    if (!formData.exerciseNumber.trim()) {
      pushToast({
        title: "Validation Error",
        description: "Exercise number is required",
        tone: "error",
      });
      return;
    }
    if (apiType !== "fill_in_blanks" && !formData.question.trim()) {
      pushToast({
        title: "Validation Error",
        description: "Question is required",
        tone: "error",
      });
      return;
    }
    if (apiType !== "fill_in_blanks" && !formData.solution.trim()) {
      pushToast({
        title: "Validation Error",
        description: "Solution is required",
        tone: "error",
      });
      return;
    }
    if (apiType === "fill_in_blanks" && formData.statements.length === 0) {
      pushToast({
        title: "Validation Error",
        description: "At least one statement with blanks is required for fill in the blanks",
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
          type: apiType,
          problemMarkdown: apiType === "numerical" ? formData.question : undefined,
          solutionCode: apiType === "numerical" ? formData.solution : undefined,
          visualizationHtml: apiType === "numerical" ? formData.visualizationHtml || undefined : undefined,
          blanksAnswer: apiType === "fill_in_blanks" ? formData.blanksAnswer : undefined,
          statements: apiType === "fill_in_blanks" ? formData.statements : undefined,
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
          type: apiType,
          problemMarkdown: apiType === "numerical" ? formData.question : undefined,
          solutionCode: apiType === "numerical" ? formData.solution : undefined,
          visualizationHtml: apiType === "numerical" ? formData.visualizationHtml || undefined : undefined,
          blanksAnswer: apiType === "fill_in_blanks" ? formData.blanksAnswer : undefined,
          statements: apiType === "fill_in_blanks" ? formData.statements : undefined,
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
    setActiveSection(API_TYPE_TO_SECTION[exercise.type] ?? "long");
    setFormData({
      exerciseNumber: exercise.exerciseNumber,
      question: exercise.question,
      solution: exercise.solution,
      difficulty: exercise.difficulty,
      visualizationHtml: exercise.visualizationHtml || "",
      blanksAnswer: exercise.blanksAnswer || [],
      statements: exercise.statements || [],
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
    setActiveSection("long");
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
        return "bg-bg-subtle";
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "short":
        return "info";
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

  const getTypeLabel = (type: string): string => {
    switch (type) {
      case "short": return "Short";
      case "long": return "Long";
      case "numerical": return "Physics";
      case "fill_in_blanks": return "Fill Blanks";
      case "mcq": return "MCQ (Legacy)";
      default: return type;
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
            <p className="text-sm text-text-secondary">
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
          <Filter className="h-4 w-4 text-text-secondary" />
          <span className="text-sm text-text-secondary mr-1">Filter:</span>
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
                    : "bg-bg-subtle/50 text-text-secondary hover:bg-bg-subtle hover:text-text-primary"
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
         <div className="rounded-xl border bg-bg-surface shadow-sm overflow-hidden animate-in slide-in-from-top duration-300">
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                {editingExercise ? "Edit Exercise" : "Add New Exercise"}
                {editingExercise && (
                  <Badge variant={getTypeBadgeVariant(editingExercise.type)} className="text-xs">
                    {getTypeLabel(editingExercise.type)}
                  </Badge>
                )}
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

            {/* Metadata Row: Number & Difficulty */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Exercise Number <span className="text-accent-danger">*</span>
                </label>
                <Input
                  value={formData.exerciseNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, exerciseNumber: e.target.value }))}
                  placeholder="e.g., 1, 2, Q1"
                />
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

            {/* Exercise Type Tabs */}
            <div className="space-y-4">
              <label className="text-sm font-medium">Exercise Type</label>
              <ExerciseTypeTabs
                value={activeSection}
                onValueChange={setActiveSection}
              />

              {/* Animated Section Panel */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSection}
                  id={`exercise-panel-${activeSection}`}
                  role="tabpanel"
                  aria-labelledby={`exercise-tab-${activeSection}`}
                  tabIndex={0}
                  variants={panelVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={panelTransition}
                >
                  <ExerciseSectionCard type={activeSection} active>
                    <ExerciseSectionHeader
                      type={activeSection}
                      icon={SECTION_META[activeSection].icon}
                      title={SECTION_META[activeSection].title}
                      trailing={
                        <Badge variant="outline" size="sm">
                          {SECTION_META[activeSection].description}
                        </Badge>
                      }
                    />
                    <ExerciseSectionBody>
                      {/* Question Editor */}
                      {activeSection === "blanks" ? (
                        <div className="space-y-2">
                          <label className="text-sm font-medium flex items-center gap-2">
                            Fill in the Blanks <span className="text-accent-danger">*</span>
                          </label>
                          <FillInBlanksEditor
                            statementsValue={formData.statements}
                            onStatementsChange={(statements) => setFormData(prev => ({ ...prev, statements }))}
                          />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className="text-sm font-medium flex items-center gap-2">
                            Question <span className="text-accent-danger">*</span>
                          </label>
                          <GithubMarkdownEditor
                            value={formData.question}
                            onChange={(value) => setFormData(prev => ({ ...prev, question: value }))}
                            onImageUpload={handleImageUpload}
                            placeholder="Enter the exercise question in markdown..."
                            minHeight={activeSection === "short" ? 128 : 200}
                          />
                        </div>
                      )}

                      {/* Solution Editor */}
                      {activeSection !== "blanks" && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium flex items-center gap-2">
                            Solution <span className="text-accent-danger">*</span>
                          </label>
                          <GithubMarkdownEditor
                            value={formData.solution}
                            onChange={(value) => setFormData(prev => ({ ...prev, solution: value }))}
                            onImageUpload={handleImageUpload}
                            placeholder="Enter the solution in markdown..."
                            minHeight={activeSection === "short" ? 128 : 200}
                          />
                        </div>
                      )}

                      {/* Physics: Visualization Editor */}
                      {activeSection === "physics" && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Illustration (HTML/CSS/JS)</label>
                           <p className="text-xs text-text-secondary">
                            Create an interactive visualization for students
                          </p>
                          <NumericalVisualizationEditor
                            value={formData.visualizationHtml}
                            onChange={(value) => setFormData(prev => ({ ...prev, visualizationHtml: value }))}
                          />
                        </div>
                      )}
                    </ExerciseSectionBody>
                  </ExerciseSectionCard>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

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
        <div className="relative overflow-hidden rounded-xl border border-dashed border-border-default bg-bg-subtle/5">
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="rounded-full bg-bg-subtle/20 p-4 mb-4">
              <Brain className="h-10 w-10 text-text-secondary/60" />
            </div>
            <h3 className="text-lg font-medium mb-1">
              {typeFilter === "all" ? "No exercises yet" : `No ${typeFilter} exercises found`}
            </h3>
            <p className="text-sm text-text-secondary max-w-xs mb-6">
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
            return (
              <div 
                key={exercise.id}
                className="group rounded-xl border bg-bg-surface shadow-sm overflow-hidden transition-all hover:shadow-md hover:border-[var(--primary)]/20"
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
                          {getTypeLabel(exercise.type)}
                        </Badge>

                        {/* Difficulty Indicator */}
                        <div className="flex items-center gap-1.5">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            getDifficultyColor(exercise.difficulty)
                          )} />
                          <span className="text-xs text-text-secondary capitalize">
                            {exercise.difficulty}
                          </span>
                        </div>
                      </div>

                      {/* Question */}
                      <div className="text-sm font-medium mb-3 leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                        {exercise.type === "fill_in_blanks" && exercise.statements && exercise.statements.length > 0 ? (
                          <div className="space-y-1.5 not-prose">
                            <p className="text-text-primary flex items-center gap-1.5">
                              <TextCursorInput className="h-3.5 w-3.5 text-violet-500" />
                              {exercise.question || "Fill in the Blanks"}
                            </p>
                            <div className="pl-5 space-y-0.5">
                              {exercise.statements.map((stmt, i) => (
                                <p key={i} className="text-text-secondary text-xs">
                                  {i + 1}. {stmt.text.replace(/\{\{blank\}\}/g, "_______")}
                                </p>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <MarkdownMathRenderer content={exercise.question} />
                        )}
                      </div>

                      {/* Solution Preview */}
                      <div className="p-3 rounded-lg bg-bg-subtle/30 border border-border-default">
                        <p className="text-xs font-medium text-text-secondary mb-1 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Solution
                        </p>
                        <div className="text-sm text-text-secondary prose prose-sm dark:prose-invert max-w-none">
                          <MarkdownMathRenderer content={
                            exercise.solution.length > 300
                              ? `${exercise.solution.substring(0, 300)}...`
                              : exercise.solution
                          } />
                        </div>
                      </div>
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
                         className="text-accent-danger hover:text-accent-danger"
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

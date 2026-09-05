"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Clock,
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  X,
  CheckCircle,
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
  getAdminQuiz,
  getAdminQuizQuestions,
  upsertAdminQuiz,
  deleteAdminQuiz,
  createAdminQuizQuestion,
  updateAdminQuizQuestion,
  deleteAdminQuizQuestion,
} from "@/lib/admin-api";
import type { QuizResponse, QuizQuestionResponse } from "@/lib/admin-api";

type ChapterQuizManagerProps = {
  chapterId: number;
};

type QuestionFormData = {
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: "a" | "b" | "c" | "d";
  explanation: string | null;
  marks: number;
};

const initialQuestionForm: QuestionFormData = {
  questionText: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correctOption: "a",
  explanation: "",
  marks: 1,
};

export function ChapterQuizManager({ chapterId }: ChapterQuizManagerProps) {
  const { pushToast } = useToast();
  const [quiz, setQuiz] = useState<QuizResponse | null>(null);
  const [questions, setQuestions] = useState<QuizQuestionResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestionResponse | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    type: "quiz" | "question";
    id?: number;
  }>({
    show: false,
    type: "quiz",
  });

  // Quiz metadata form
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDuration, setQuizDuration] = useState(30);

  // Question form
  const [questionForm, setQuestionForm] = useState<QuestionFormData>(initialQuestionForm);

  const fetchQuiz = useCallback(async () => {
    setIsLoading(true);
    try {
      const quizData = await getAdminQuiz(chapterId);
      setQuiz(quizData);
      if (quizData) {
        const questionsData = await getAdminQuizQuestions(quizData.id);
        setQuestions(questionsData);
      }
    } catch (error) {
      console.error("Failed to fetch quiz:", error);
      pushToast({
        title: "Failed to load quiz",
        description: "Please try again or contact support.",
        tone: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [chapterId, pushToast]);

  useEffect(() => {
    fetchQuiz();
  }, [fetchQuiz]);

  const handleCreateQuiz = async () => {
    if (!quizTitle.trim()) {
      pushToast({
        title: "Validation Error",
        description: "Quiz title is required",
        tone: "error",
      });
      return;
    }
    setIsSaving(true);
    try {
      const newQuiz = await upsertAdminQuiz({
        chapterId,
        title: quizTitle,
        durationMinutes: quizDuration,
      });
      setQuiz(newQuiz.data);
      setShowQuizForm(false);
      setQuizTitle("");
      setQuizDuration(30);
      pushToast({
        title: "Quiz created",
        description: `"${newQuiz.data.title}" is ready for questions`,
        tone: "success",
      });
      // Fetch questions for the new quiz
      const questionsData = await getAdminQuizQuestions(newQuiz.data.id);
      setQuestions(questionsData);
    } catch (error) {
      console.error("Failed to create quiz:", error);
      pushToast({
        title: "Failed to create quiz",
        description: "Please try again.",
        tone: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteQuiz = async () => {
    if (!quiz) return;
    setIsSaving(true);
    try {
      await deleteAdminQuiz(quiz.id);
      setQuiz(null);
      setQuestions([]);
      pushToast({
        title: "Quiz deleted",
        description: "The quiz has been removed.",
        tone: "success",
      });
    } catch (error) {
      console.error("Failed to delete quiz:", error);
      pushToast({
        title: "Failed to delete quiz",
        tone: "error",
      });
    } finally {
      setIsSaving(false);
      setDeleteConfirm({ show: false, type: "quiz" });
    }
  };

  const handleSaveQuestion = async () => {
    if (!quiz || !quiz.id || quiz.id <= 0) {
      pushToast({
        title: "Error",
        description: "Quiz not properly loaded. Please refresh and try again.",
        tone: "error",
      });
      return;
    }
    if (
      !questionForm.questionText.trim() ||
      !questionForm.optionA.trim() ||
      !questionForm.optionB.trim() ||
      !questionForm.optionC.trim() ||
      !questionForm.optionD.trim()
    ) {
      pushToast({
        title: "Validation Error",
        description: "All question fields are required",
        tone: "error",
      });
      return;
    }
    setIsSaving(true);
    try {
      if (editingQuestion) {
        const updated = await updateAdminQuizQuestion({
          id: editingQuestion.id,
          input: {
            question: questionForm.questionText,
            optionA: questionForm.optionA,
            optionB: questionForm.optionB,
            optionC: questionForm.optionC,
            optionD: questionForm.optionD,
            correctOption: questionForm.correctOption,
            explanation: questionForm.explanation ?? undefined,
            marks: questionForm.marks,
          },
        });
        setQuestions((prev) => prev.map((q) => (q.id === editingQuestion.id ? updated.data : q)));
        pushToast({
          title: "Question updated",
          tone: "success",
        });
      } else {
        const created = await createAdminQuizQuestion({
          quizId: quiz.id,
          question: questionForm.questionText,
          optionA: questionForm.optionA,
          optionB: questionForm.optionB,
          optionC: questionForm.optionC,
          optionD: questionForm.optionD,
          correctOption: questionForm.correctOption,
          explanation: questionForm.explanation ?? undefined,
          marks: questionForm.marks,
        });
        setQuestions((prev) => [...prev, created.data]);
        pushToast({
          title: "Question added",
          tone: "success",
        });
      }
      resetQuestionForm();
    } catch (error) {
      console.error("Failed to save question:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      pushToast({
        title: "Failed to save question",
        description: errorMessage,
        tone: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditQuestion = (question: QuizQuestionResponse) => {
    setEditingQuestion(question);
    setQuestionForm({
      questionText: question.question,
      optionA: question.optionA,
      optionB: question.optionB,
      optionC: question.optionC,
      optionD: question.optionD,
      correctOption: question.correctOption,
      explanation: question.explanation,
      marks: question.marks,
    });
    setShowQuestionForm(true);
    setExpandedQuestion(null);
  };

  const handleDeleteQuestion = async () => {
    if (!deleteConfirm.id) return;
    try {
      await deleteAdminQuizQuestion(deleteConfirm.id);
      setQuestions((prev) => prev.filter((q) => q.id !== deleteConfirm.id));
      pushToast({
        title: "Question deleted",
        tone: "success",
      });
    } catch (error) {
      console.error("Failed to delete question:", error);
      pushToast({
        title: "Failed to delete question",
        tone: "error",
      });
    } finally {
      setDeleteConfirm({ show: false, type: "question" });
    }
  };

  const resetQuestionForm = () => {
    setQuestionForm(initialQuestionForm);
    setEditingQuestion(null);
    setShowQuestionForm(false);
  };

  const resetQuizForm = () => {
    setQuizTitle("");
    setQuizDuration(30);
    setShowQuizForm(false);
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  // No quiz exists - show create form
  if (!quiz && !showQuizForm) {
    return (
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-gradient-to-b from-[var(--primary)] to-[var(--primary-hover)] rounded-full" />
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Quiz</h2>
              <p className="text-sm text-muted-foreground">
                Create interactive assessments for this chapter
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowQuizForm(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Quiz
          </Button>
        </div>

        {/* Empty State */}
        <div className="relative overflow-hidden rounded-xl border border-dashed border-border bg-muted/5">
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="rounded-full bg-muted/20 p-4 mb-4">
              <Award className="h-10 w-10 text-muted-foreground/60" />
            </div>
            <h3 className="text-lg font-medium mb-1">No quiz yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs mb-6">
              Create a quiz to test student understanding of the chapter content
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowQuizForm(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Create First Quiz
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show quiz create form
  if (!quiz && showQuizForm) {
    return (
      <div className="space-y-6 animate-in slide-in-from-top duration-300">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={resetQuizForm} className="gap-1">
            <ChevronUp className="h-4 w-4 rotate-90" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-gradient-to-b from-[var(--primary)] to-[var(--primary-hover)] rounded-full" />
            <h2 className="text-xl font-semibold tracking-tight">Create Quiz</h2>
          </div>
        </div>

        {/* Form Card */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="p-6 space-y-6">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Quiz Title <span className="text-destructive">*</span>
              </label>
              <Input
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                placeholder="e.g., Chapter 3 Forces and Motion - Quiz"
                className="text-base"
              />
            </div>
            <div className="max-w-xs">
              <label className="text-sm font-medium mb-2 block">Duration (minutes)</label>
              <Input
                type="number"
                value={quizDuration}
                onChange={(e) => setQuizDuration(parseInt(e.target.value) || 30)}
                min={1}
                max={180}
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-muted/5 border-t">
            <Button variant="secondary" onClick={resetQuizForm}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateQuiz}
              disabled={isSaving}
              className="gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Create Quiz
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Quiz exists - show quiz details and questions
  return (
    <div className="space-y-6">
      {/* Quiz Header Card */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-8 bg-gradient-to-b from-[var(--primary)] to-[var(--primary-hover)] rounded-full" />
                <h2 className="text-xl font-semibold tracking-tight truncate">{quiz!.title}</h2>
              </div>

              {/* Stats Bar */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{quiz!.durationMinutes} min</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 text-sm">
                  <Award className="h-4 w-4 text-muted-foreground" />
                  <span>{quiz!.totalMarks} marks</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  <span>{questions.length} questions</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant={quiz!.type === "chapter_quiz" ? "info" : "warning"}
                className="text-xs"
              >
                {quiz!.type === "chapter_quiz" ? "Chapter Quiz" : "Mock Exam"}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteConfirm({ show: true, type: "quiz" })}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Questions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold tracking-tight">Questions</h3>
          {!showQuestionForm && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                resetQuestionForm();
                setShowQuestionForm(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Question
            </Button>
          )}
        </div>

        {/* Question Form */}
        {showQuestionForm && (
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden animate-in slide-in-from-top duration-300">
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">
                  {editingQuestion ? "Edit Question" : "Add New Question"}
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetQuestionForm}
                  className="text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Question <span className="text-destructive">*</span>
                  </label>
                  <Textarea
                    value={questionForm.questionText}
                    onChange={(e) =>
                      setQuestionForm((prev) => ({ ...prev, questionText: e.target.value }))
                    }
                    placeholder="Enter the question text..."
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(["A", "B", "C", "D"] as const).map((option) => (
                    <div key={option}>
                      <label className="text-sm font-medium mb-2 block">
                        Option {option} <span className="text-destructive">*</span>
                      </label>
                      <Input
                        value={questionForm[`option${option}` as keyof QuestionFormData] as string}
                        onChange={(e) =>
                          setQuestionForm((prev) => ({
                            ...prev,
                            [`option${option}`]: e.target.value,
                          }))
                        }
                        placeholder={`Option ${option}`}
                        className={
                          questionForm.correctOption === option.toLowerCase()
                            ? "border-[var(--primary)] bg-[var(--primary)]/5"
                            : ""
                        }
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Correct Answer</label>
                    <Select
                      value={questionForm.correctOption}
                      onChange={(e) =>
                        setQuestionForm((prev) => ({
                          ...prev,
                          correctOption: e.target.value as "a" | "b" | "c" | "d",
                        }))
                      }
                      className="bg-[var(--primary)]/10 border-[var(--primary)]/30"
                    >
                      <option value="a">A</option>
                      <option value="b">B</option>
                      <option value="c">C</option>
                      <option value="d">D</option>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Marks</label>
                    <Input
                      type="number"
                      value={questionForm.marks}
                      onChange={(e) =>
                        setQuestionForm((prev) => ({
                          ...prev,
                          marks: parseInt(e.target.value) || 1,
                        }))
                      }
                      min={1}
                      max={100}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Explanation</label>
                  <Textarea
                    value={questionForm.explanation ?? ""}
                    onChange={(e) =>
                      setQuestionForm((prev) => ({ ...prev, explanation: e.target.value }))
                    }
                    placeholder="Explain why the correct answer is correct..."
                    rows={2}
                    className="resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-muted/5 border-t">
              <Button variant="secondary" onClick={resetQuestionForm}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveQuestion}
                disabled={isSaving}
                className="gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingQuestion ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Update Question
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add Question
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Questions List */}
        {questions.length === 0 && !showQuestionForm ? (
          <div className="relative overflow-hidden rounded-xl border border-dashed border-border bg-muted/5">
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="rounded-full bg-muted/20 p-4 mb-4">
                <CheckCircle2 className="h-10 w-10 text-muted-foreground/60" />
              </div>
              <h3 className="text-lg font-medium mb-1">No questions yet</h3>
              <p className="text-sm text-muted-foreground max-w-xs mb-6">
                Add questions to make your quiz interactive
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  resetQuestionForm();
                  setShowQuestionForm(true);
                }}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add First Question
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {questions.map((question, index) => (
              <div
                key={question.id}
                className="rounded-xl border bg-card shadow-sm overflow-hidden transition-shadow hover:shadow-md"
              >
                {/* Question Header */}
                <button
                  onClick={() =>
                    setExpandedQuestion(expandedQuestion === question.id ? null : question.id)
                  }
                  className="w-full p-4 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-semibold text-sm flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="font-medium truncate">{question.question}</span>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Badge variant="neutral" className="hidden sm:inline-flex">
                      {question.marks} {question.marks === 1 ? "mark" : "marks"}
                    </Badge>
                    <Badge variant="success" className="hidden sm:inline-flex gap-1">
                      <CheckCircle className="h-3 w-3" />
                      {question.correctOption.toUpperCase()}
                    </Badge>
                    {expandedQuestion === question.id ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Expanded Content */}
                {expandedQuestion === question.id && (
                  <div className="px-4 pb-4 pt-0 space-y-4 animate-in slide-in-from-top-2 duration-200">
                    {/* Options Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(["A", "B", "C", "D"] as const).map((option) => {
                        const optionKey = `option${option}` as keyof QuizQuestionResponse;
                        const isCorrect = question.correctOption === option.toLowerCase();
                        return (
                          <div
                            key={option}
                            className={`p-3 rounded-lg border transition-colors ${
                              isCorrect
                                ? "bg-success/10 border-success/30 text-success"
                                : "bg-muted/50 border-border"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-semibold text-sm ${
                                  isCorrect ? "text-success" : "text-muted-foreground"
                                }`}
                              >
                                {option}.
                              </span>
                              <span className="text-sm truncate">
                                {question[optionKey] as string}
                              </span>
                              {isCorrect && (
                                <CheckCircle className="h-4 w-4 ml-auto flex-shrink-0" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    {question.explanation && (
                      <div className="p-3 rounded-lg bg-muted/50 border border-border">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Explanation
                        </p>
                        <p className="text-sm">{question.explanation}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditQuestion(question)}
                        className="gap-2"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setDeleteConfirm({ show: true, type: "question", id: question.id })
                        }
                        className="gap-2 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirm.show}
        title={deleteConfirm.type === "quiz" ? "Delete Quiz?" : "Delete Question?"}
        description={
          deleteConfirm.type === "quiz"
            ? "This will permanently delete the quiz and all its questions. This action cannot be undone."
            : "This will permanently delete this question. This action cannot be undone."
        }
        confirmLabel="Delete"
        danger
        isPending={isSaving}
        onConfirm={deleteConfirm.type === "quiz" ? handleDeleteQuiz : handleDeleteQuestion}
        onCancel={() => setDeleteConfirm({ show: false, type: "quiz" })}
      />
    </div>
  );
}

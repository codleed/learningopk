"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import {
  AdminBreadcrumb,
  AdminPageHeader,
  AdminFormCard,
  AdminFormField,
  AdminActionButton,
} from "@/components/admin";
import { Select } from "@/components/ui/select";
import { CodeMirrorMarkdownEditor } from "@/components/admin/codemirror-markdown-editor";
import { FillInBlanksEditor } from "@/components/admin/fill-in-blanks-editor";
import { NumericalVisualizationEditor } from "@/components/admin/numerical-visualization-editor";
import {
  createAdminCurriculumExercise,
  type AdminCurriculumBoard,
} from "@/lib/admin-api";
import { useToast } from "@/components/ui/toast";
import { MarkdownMathRenderer } from "@/components/learn/markdown-math-renderer";

interface AddExerciseFormProps {
  boards: AdminCurriculumBoard[];
  preSelectedChapterId?: number;
}

interface ChapterOption {
  id: number;
  label: string;
}

export function AddExerciseForm({ boards, preSelectedChapterId }: AddExerciseFormProps) {
  const router = useRouter();
  const { pushToast } = useToast();
  const searchParams = useSearchParams();
  
  // Flatten boards > classes > subjects > chapters for chapter options
  const chapterOptions: ChapterOption[] = boards.flatMap((board) =>
    board.classes.flatMap((boardClass) =>
      boardClass.subjects.flatMap((subject) =>
        subject.chapters.map((chapter) => ({
          id: chapter.id,
          label: `${board.name} / ${boardClass.name} / ${subject.name} / Chapter ${chapter.chapterNumber}: ${chapter.title}`,
        }))
      )
    )
  );

  const [chapterId, setChapterId] = useState<string>(
    preSelectedChapterId?.toString() || searchParams.get("chapterId") || ""
  );
  const [exerciseNumber, setExerciseNumber] = useState<string>("");
  const [type, setType] = useState<string>("mcq");
  const [difficulty, setDifficulty] = useState<string>("medium");
  const [question, setQuestion] = useState<string>("");
  const [solution, setSolution] = useState<string>("");
  const [showQuestionPreview, setShowQuestionPreview] = useState<boolean>(false);
  const [showSolutionPreview, setShowSolutionPreview] = useState<boolean>(false);
  const [blanksAnswer, setBlanksAnswer] = useState<string[]>([]);
  const [visualizationHtml, setVisualizationHtml] = useState<string>("");

  // Errors
  const [chapterError, setChapterError] = useState<string>("");
  const [exerciseNumberError, setExerciseNumberError] = useState<string>("");
  const [questionError, setQuestionError] = useState<string>("");
  const [solutionError, setSolutionError] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    let hasError = false;

    if (!chapterId) {
      setChapterError("Chapter is required");
      hasError = true;
    }

    if (!exerciseNumber.trim()) {
      setExerciseNumberError("Exercise number is required");
      hasError = true;
    }

    if (!question.trim()) {
      setQuestionError("Question is required");
      hasError = true;
    }

    if (!solution.trim()) {
      setSolutionError("Solution is required");
      hasError = true;
    }

    if (type === "fill_in_blanks" && blanksAnswer.length === 0) {
      setQuestionError("At least one {{blank}} answer is required");
      hasError = true;
    }

    return !hasError;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await createAdminCurriculumExercise({
        chapterId: parseInt(chapterId, 10),
        exerciseNumber: exerciseNumber.trim(),
        question: question.trim(),
        solution: solution.trim(),
        difficulty: difficulty as "easy" | "medium" | "hard",
        type: type as "mcq" | "short" | "long" | "numerical" | "fill_in_blanks",
        visualizationHtml: type === "numerical" ? visualizationHtml : undefined,
        blanksAnswer: type === "fill_in_blanks" ? blanksAnswer : undefined,
      });

      pushToast({
        title: "Exercise created",
        description: `Exercise ${exerciseNumber} has been created successfully.`,
        tone: "success",
      });

      router.push("/admin/content/exercises");
    } catch (error) {
      pushToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create exercise",
        tone: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminBreadcrumb
        segments={[
          { label: "Admin", href: "/admin" },
          { label: "Content", href: "/admin/content" },
          { label: "Exercises", href: "/admin/content/exercises" },
          { label: "Add Exercise" },
        ]}
      />

      <AdminPageHeader
        title="Add Exercise"
        subtitle="Create a new exercise under a chapter"
      />

      <AdminFormCard>
        <form onSubmit={handleSubmit} className="space-y-6">
          <AdminFormField
            id="exercise-chapter"
            label="Chapter"
            required
            error={chapterError}
          >
            <Select
              id="exercise-chapter"
              value={chapterId}
              onChange={(e) => {
                setChapterId(e.target.value);
                setChapterError("");
              }}
              aria-invalid={!!chapterError}
            >
              <option value="">Select a chapter</option>
              {chapterOptions.map((option) => (
                <option key={option.id} value={option.id.toString()}>
                  {option.label}
                </option>
              ))}
            </Select>
          </AdminFormField>

          <div className="grid gap-6 sm:grid-cols-2">
            <AdminFormField
              id="exercise-number"
              label="Exercise Number"
              required
              error={exerciseNumberError}
              hint="e.g., 3.1, 3.2, etc."
            >
              <input
                id="exercise-number"
                type="text"
                value={exerciseNumber}
                onChange={(e) => {
                  setExerciseNumber(e.target.value);
                  setExerciseNumberError("");
                }}
                placeholder="e.g., 3.1"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              />
            </AdminFormField>

            <AdminFormField id="exercise-type" label="Type" required>
              <Select
                id="exercise-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="mcq">Multiple Choice (MCQ)</option>
                <option value="short">Short Answer</option>
                <option value="long">Long Answer</option>
                <option value="numerical">Numerical</option>
                <option value="fill_in_blanks">Fill in the Blanks</option>
              </Select>
            </AdminFormField>
          </div>

          <AdminFormField id="exercise-difficulty" label="Difficulty" required>
            <Select
              id="exercise-difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </Select>
          </AdminFormField>

          {type === "fill_in_blanks" ? (
            <AdminFormField
              id="exercise-question"
              label="Question"
              required
              error={questionError}
            >
              <FillInBlanksEditor
                questionValue={question}
                onQuestionChange={(value) => {
                  setQuestion(value);
                  setQuestionError("");
                }}
                answersValue={blanksAnswer}
                onAnswersChange={setBlanksAnswer}
              />
            </AdminFormField>
          ) : (
            <AdminFormField
              id="exercise-question"
              label="Question"
              required
              error={questionError}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowQuestionPreview(!showQuestionPreview)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent/50"
                  >
                    {showQuestionPreview ? "Edit" : "Preview"}
                  </button>
                </div>
                {showQuestionPreview ? (
                  <div className="min-h-48 rounded-lg border border-[var(--border)] bg-card p-4">
                    {question ? (
                      <MarkdownMathRenderer content={question} />
                    ) : (
                      <p className="text-sm text-[var(--muted-foreground)]">No content to preview</p>
                    )}
                  </div>
                ) : (
                  <CodeMirrorMarkdownEditor
                    value={question}
                    onChange={(value) => {
                      setQuestion(value);
                      setQuestionError("");
                    }}
                    placeholderText="Enter your question in markdown..."
                  />
                )}
              </div>
            </AdminFormField>
          )}

          <AdminFormField
            id="exercise-solution"
            label="Solution"
            required
            error={solutionError}
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSolutionPreview(!showSolutionPreview)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent/50"
                >
                  {showSolutionPreview ? "Edit" : "Preview"}
                </button>
              </div>
              {showSolutionPreview ? (
                <div className="min-h-48 rounded-lg border border-[var(--border)] bg-card p-4">
                  {solution ? (
                    <MarkdownMathRenderer content={solution} />
                  ) : (
                    <p className="text-sm text-[var(--muted-foreground)]">No content to preview</p>
                  )}
                </div>
              ) : (
                <CodeMirrorMarkdownEditor
                  value={solution}
                  onChange={(value) => {
                    setSolution(value);
                    setSolutionError("");
                  }}
                  placeholderText="Enter the solution in markdown..."
                />
              )}
            </div>
          </AdminFormField>

          {type === "numerical" && (
            <AdminFormField
              id="exercise-visualization"
              label="Illustration (HTML/CSS/JS)"
            >
              <NumericalVisualizationEditor
                value={visualizationHtml}
                onChange={setVisualizationHtml}
              />
            </AdminFormField>
          )}

          <div className="flex items-center gap-3 pt-2">
            <AdminActionButton
              variant="primary"
              type="submit"
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              Create Exercise
            </AdminActionButton>
            <Link href="/admin/content/exercises">
              <AdminActionButton variant="secondary" type="button">
                Cancel
              </AdminActionButton>
            </Link>
          </div>
        </form>
      </AdminFormCard>
    </div>
  );
}

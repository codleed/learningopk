"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

import {
  AdminBreadcrumb,
  AdminPageHeader,
  AdminFormCard,
  AdminFormField,
  AdminActionButton,
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
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { GithubMarkdownEditor } from "@/components/admin/github-markdown-editor";
import { FillInBlanksEditor } from "@/components/admin/fill-in-blanks-editor";
import { NumericalVisualizationEditor } from "@/components/admin/numerical-visualization-editor";
import {
  updateAdminCurriculumExercise,
  deleteAdminCurriculumExercise,
  uploadAdminChapterSummaryMedia,
  type AdminCurriculumBoard,
  type AdminCurriculumExerciseRead,
} from "@/lib/admin-api";
import { useToast } from "@/components/ui/toast";

/* ─── Props ─── */

interface EditExerciseFormProps {
  exercise: AdminCurriculumExerciseRead & {
    boardName: string;
    className: string;
    subjectName: string;
    chapterTitle: string;
  };
  boards: AdminCurriculumBoard[];
}

interface ChapterOption {
  id: number;
  label: string;
}

/* ─── Component ─── */

export function EditExerciseForm({ exercise, boards }: EditExerciseFormProps) {
  const router = useRouter();
  const { pushToast } = useToast();

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

  /* ── Form state ── */
  const [chapterId, setChapterId] = useState<string>(exercise.chapterId.toString());
  const [exerciseNumber, setExerciseNumber] = useState<string>(exercise.exerciseNumber);
  const [activeSection, setActiveSection] = useState<ExerciseSectionType>(
    API_TYPE_TO_SECTION[exercise.type] ?? "long"
  );
  const [difficulty, setDifficulty] = useState<string>(exercise.difficulty);
  const [question, setQuestion] = useState<string>(exercise.question);
  const [solution, setSolution] = useState<string>(exercise.solution);
  const [blanksAnswer, setBlanksAnswer] = useState<string[]>(exercise.blanksAnswer ?? []);
  const [visualizationHtml, setVisualizationHtml] = useState<string>(exercise.visualizationHtml ?? "");

  /* ── Errors ── */
  const [chapterError, setChapterError] = useState<string>("");
  const [exerciseNumberError, setExerciseNumberError] = useState<string>("");
  const [questionError, setQuestionError] = useState<string>("");
  const [solutionError, setSolutionError] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ── Derived ── */
  const apiType = SECTION_TO_API_TYPE[activeSection];

  /* ── Image upload handler ── */

  const handleImageUpload = useMemo(() => {
    const parsedChapterId = parseInt(chapterId, 10);
    if (!chapterId || Number.isNaN(parsedChapterId)) return undefined;

    return async (file: File) => {
      try {
        const response = await uploadAdminChapterSummaryMedia({
          chapterId: parsedChapterId,
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

  /* ── Handlers ── */

  const handleSectionChange = useCallback((section: ExerciseSectionType) => {
    setActiveSection(section);
    setQuestionError("");
    setSolutionError("");
  }, []);

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

    if (apiType === "fill_in_blanks" && blanksAnswer.length === 0) {
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
      await updateAdminCurriculumExercise({
        exerciseId: exercise.id,
        exerciseNumber: exerciseNumber.trim(),
        question: question.trim(),
        solution: solution.trim(),
        difficulty: difficulty as "easy" | "medium" | "hard",
        type: apiType,
        visualizationHtml: apiType === "numerical" ? visualizationHtml : undefined,
        blanksAnswer: apiType === "fill_in_blanks" ? blanksAnswer : undefined,
      });

      pushToast({
        title: "Exercise updated",
        description: `Exercise ${exerciseNumber} has been updated successfully.`,
        tone: "success",
      });

      router.push("/admin/content/exercises");
    } catch (error) {
      pushToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update exercise",
        tone: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (
      window.confirm(
        `Are you sure you want to delete Exercise ${exercise.exerciseNumber}? This action cannot be undone.`
      )
    ) {
      try {
        await deleteAdminCurriculumExercise(exercise.id);
        pushToast({
          title: "Exercise deleted",
          description: `Exercise ${exercise.exerciseNumber} has been deleted.`,
          tone: "success",
        });
        router.push("/admin/content/exercises");
      } catch (error) {
        pushToast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to delete exercise",
          tone: "error",
        });
      }
    }
  };

  /* ── Shared editor blocks ── */

  const renderQuestionEditor = () => {
    if (activeSection === "blanks") {
      return (
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
      );
    }

    return (
      <AdminFormField
        id="exercise-question"
        label="Question"
        required
        error={questionError}
      >
        <GithubMarkdownEditor
          value={question}
          onChange={(value) => {
            setQuestion(value);
            setQuestionError("");
          }}
          onImageUpload={handleImageUpload}
          placeholder="Enter your question in markdown..."
          minHeight={activeSection === "short" ? 128 : 200}
        />
      </AdminFormField>
    );
  };

  const renderSolutionEditor = () => (
    <AdminFormField
      id="exercise-solution"
      label="Solution"
      required
      error={solutionError}
    >
      <GithubMarkdownEditor
        value={solution}
        onChange={(value) => {
          setSolution(value);
          setSolutionError("");
        }}
        onImageUpload={handleImageUpload}
        placeholder="Enter the solution in markdown..."
        minHeight={activeSection === "short" ? 128 : 200}
      />
    </AdminFormField>
  );

  const renderVisualizationEditor = () => {
    if (activeSection !== "physics") return null;

    return (
      <AdminFormField
        id="exercise-visualization"
        label="Illustration (HTML/CSS/JS)"
      >
        <NumericalVisualizationEditor
          value={visualizationHtml}
          onChange={setVisualizationHtml}
        />
      </AdminFormField>
    );
  };

  const renderSectionContent = () => (
    <ExerciseSectionBody>
      {renderQuestionEditor()}
      {renderSolutionEditor()}
      {renderVisualizationEditor()}
    </ExerciseSectionBody>
  );

  const meta = SECTION_META[activeSection];

  return (
    <div className="space-y-6">
      <AdminBreadcrumb
        segments={[
          { label: "Admin", href: "/admin" },
          { label: "Content", href: "/admin/content" },
          { label: "Exercises", href: "/admin/content/exercises" },
          { label: `Edit Exercise ${exercise.exerciseNumber}` },
        ]}
      />

      <AdminPageHeader
        title={`Edit Exercise ${exercise.exerciseNumber}`}
        subtitle={`${exercise.boardName} / ${exercise.className} / ${exercise.subjectName} / ${exercise.chapterTitle}`}
      />

      {/* ── Metadata Card ── */}
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
                className="w-full rounded-lg border border-border-default bg-bg-base px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
              />
            </AdminFormField>

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
          </div>

          {/* ── Exercise Type Tabs ── */}
          <div className="space-y-4">
            <AdminFormField
              id="exercise-type"
              label="Exercise Type"
              required
            >
              <ExerciseTypeTabs
                value={activeSection}
                onValueChange={handleSectionChange}
              />
            </AdminFormField>

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
                    icon={meta.icon}
                    title={meta.title}
                    trailing={
                      <Badge variant="outline" size="sm">
                        {meta.description}
                      </Badge>
                    }
                  />
                  {renderSectionContent()}
                </ExerciseSectionCard>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ── Submit / Cancel / Delete ── */}
          <div className="flex items-center gap-3 pt-2">
            <AdminActionButton
              variant="primary"
              type="submit"
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              Save Changes
            </AdminActionButton>
            <Link href="/admin/content/exercises">
              <AdminActionButton variant="secondary" type="button">
                Cancel
              </AdminActionButton>
            </Link>
            <div className="ml-auto">
              <AdminActionButton
                variant="danger"
                type="button"
                onClick={handleDelete}
              >
                Delete Exercise
              </AdminActionButton>
            </div>
          </div>
        </form>
      </AdminFormCard>
    </div>
  );
}

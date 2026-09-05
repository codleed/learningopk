"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import {
  createAdminCurriculumExercise,
  deleteAdminCurriculumExercise,
  getAdminCurriculumExercises,
  updateAdminCurriculumExercise,
  type AdminCurriculumExerciseRead,
} from "@/lib/admin-api";

import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Select } from "../../ui/select";
import { Textarea } from "../../ui/textarea";
import { useToast } from "../../ui/toast";
import { TabButton } from "./tab-button";
import type {
  ChapterOption,
  EntityModeTab,
  ExerciseDifficulty,
  ExerciseType,
  SectionCommonProps,
} from "./types";

type ExerciseSectionProps = SectionCommonProps & {
  chapterOptions: ChapterOption[];
};

export function ExerciseSection({
  chapterOptions,
  isSubmitting,
  setIsSubmitting,
}: ExerciseSectionProps) {
  const { pushToast } = useToast();
  const [activeExerciseModeTab, setActiveExerciseModeTab] = useState<EntityModeTab>("add");
  const [exerciseChapterId, setExerciseChapterId] = useState("");
  const [exerciseType, setExerciseType] = useState<ExerciseType>("short");
  const [exerciseDifficulty, setExerciseDifficulty] = useState<ExerciseDifficulty>("medium");
  const [exerciseNumber, setExerciseNumber] = useState("");
  const [exerciseQuestion, setExerciseQuestion] = useState("");
  const [exerciseSolution, setExerciseSolution] = useState("");
  const [chapterExercises, setChapterExercises] = useState<AdminCurriculumExerciseRead[]>([]);
  const [isExerciseListLoading, setIsExerciseListLoading] = useState(false);
  const [manageExerciseId, setManageExerciseId] = useState("");
  const [manageExerciseType, setManageExerciseType] = useState<ExerciseType>("short");
  const [manageExerciseDifficulty, setManageExerciseDifficulty] =
    useState<ExerciseDifficulty>("medium");
  const [manageExerciseNumber, setManageExerciseNumber] = useState("");
  const [manageExerciseQuestion, setManageExerciseQuestion] = useState("");
  const [manageExerciseSolution, setManageExerciseSolution] = useState("");

  const selectedExerciseChapter = useMemo(
    () => chapterOptions.find((option) => option.id === Number(exerciseChapterId)),
    [chapterOptions, exerciseChapterId]
  );

  const isPhysicsExerciseChapter =
    selectedExerciseChapter?.subjectName.toLowerCase().includes("physics") ?? false;

  const exerciseTypeOptions = useMemo(() => {
    const baseOptions: Array<{ value: ExerciseType; label: string }> = [
      { value: "short", label: "Comprehension Questions Short Questions" },
      { value: "mcq", label: "MCQs" },
      { value: "long", label: "Comprehension Questions Long Questions" },
    ];
    if (isPhysicsExerciseChapter) {
      baseOptions.push({ value: "numerical", label: "Numerical Problems" });
    }
    return baseOptions;
  }, [isPhysicsExerciseChapter]);

  useEffect(() => {
    if (exerciseType === "numerical" && !isPhysicsExerciseChapter) {
      setExerciseType("short");
    }
  }, [exerciseType, isPhysicsExerciseChapter]);

  useEffect(() => {
    if (manageExerciseType === "numerical" && !isPhysicsExerciseChapter) {
      setManageExerciseType("short");
    }
  }, [manageExerciseType, isPhysicsExerciseChapter]);

  const refreshExercises = useCallback(
    async (chapterId: number) => {
      if (!chapterId) {
        setChapterExercises([]);
        setManageExerciseId("");
        return;
      }
      setIsExerciseListLoading(true);
      try {
        const payload = await getAdminCurriculumExercises({
          chapterId,
        });
        setChapterExercises(payload.exercises);
      } catch {
        setChapterExercises([]);
        pushToast({
          title: "Could not load exercises",
          tone: "error",
        });
      } finally {
        setIsExerciseListLoading(false);
      }
    },
    [pushToast]
  );

  useEffect(() => {
    const chapterId = Number(exerciseChapterId);
    if (!chapterId) {
      setChapterExercises([]);
      setManageExerciseId("");
      return;
    }
    void refreshExercises(chapterId);
  }, [exerciseChapterId, refreshExercises]);

  useEffect(() => {
    const selectedExercise = chapterExercises.find(
      (exercise) => exercise.id === Number(manageExerciseId)
    );
    if (!selectedExercise) {
      setManageExerciseNumber("");
      setManageExerciseQuestion("");
      setManageExerciseSolution("");
      setManageExerciseDifficulty("medium");
      setManageExerciseType("short");
      return;
    }

    setManageExerciseNumber(selectedExercise.exerciseNumber);
    setManageExerciseQuestion(selectedExercise.question);
    setManageExerciseSolution(selectedExercise.solution);
    setManageExerciseDifficulty(selectedExercise.difficulty);
    setManageExerciseType(selectedExercise.type);
  }, [chapterExercises, manageExerciseId]);

  const submitExercise = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const chapterId = Number(exerciseChapterId);
    const normalizedExerciseNumber = exerciseNumber.trim();
    const question = exerciseQuestion.trim();
    const solution = exerciseSolution.trim();

    if (!chapterId || !normalizedExerciseNumber || !question || !solution) {
      return;
    }

    if (exerciseType === "numerical" && !isPhysicsExerciseChapter) {
      pushToast({ title: "Numerical problems are only for Physics chapters", tone: "error" });
      return;
    }

    setIsSubmitting(true);
    try {
      await createAdminCurriculumExercise({
        chapterId,
        exerciseNumber: normalizedExerciseNumber,
        question,
        solution,
        difficulty: exerciseDifficulty,
        type: exerciseType,
      });
      setExerciseNumber("");
      setExerciseQuestion("");
      setExerciseSolution("");
      setExerciseDifficulty("medium");
      await refreshExercises(chapterId);
      pushToast({ title: "Exercise created", tone: "success" });
    } catch {
      pushToast({ title: "Could not create exercise", tone: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateExercise = async () => {
    const exerciseId = Number(manageExerciseId);
    const normalizedExerciseNumber = manageExerciseNumber.trim();
    const question = manageExerciseQuestion.trim();
    const solution = manageExerciseSolution.trim();

    if (!exerciseId || !normalizedExerciseNumber || !question || !solution) {
      pushToast({ title: "Select exercise and complete all fields", tone: "error" });
      return;
    }

    if (manageExerciseType === "numerical" && !isPhysicsExerciseChapter) {
      pushToast({ title: "Numerical problems are only for Physics chapters", tone: "error" });
      return;
    }

    setIsSubmitting(true);
    try {
      await updateAdminCurriculumExercise({
        exerciseId,
        exerciseNumber: normalizedExerciseNumber,
        question,
        solution,
        difficulty: manageExerciseDifficulty,
        type: manageExerciseType,
      });
      await refreshExercises(Number(exerciseChapterId));
      pushToast({ title: "Exercise updated", tone: "success" });
    } catch {
      pushToast({ title: "Could not update exercise", tone: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteExercise = async () => {
    const exerciseId = Number(manageExerciseId);
    if (!exerciseId) {
      pushToast({ title: "Select an exercise first", tone: "error" });
      return;
    }
    if (!window.confirm("Delete this exercise?")) {
      return;
    }

    setIsSubmitting(true);
    try {
      await deleteAdminCurriculumExercise(exerciseId);
      setManageExerciseId("");
      await refreshExercises(Number(exerciseChapterId));
      pushToast({ title: "Exercise deleted", tone: "success" });
    } catch {
      pushToast({ title: "Could not delete exercise", tone: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" data-testid="curriculum-exercise-mode-tabs">
        <TabButton
          testId="curriculum-exercise-mode-add"
          isActive={activeExerciseModeTab === "add"}
          onClick={() => setActiveExerciseModeTab("add")}
        >
          Add
        </TabButton>
        <TabButton
          testId="curriculum-exercise-mode-manage"
          isActive={activeExerciseModeTab === "manage"}
          onClick={() => setActiveExerciseModeTab("manage")}
        >
          Edit / Delete
        </TabButton>
      </div>

      {activeExerciseModeTab === "add" ? (
        <form
          className="space-y-2"
          data-testid="curriculum-exercise-form"
          onSubmit={submitExercise}
        >
          <p className="text-sm font-semibold text-text-primary">Add Exercise</p>
          <Select
            data-testid="curriculum-exercise-chapter-select"
            value={exerciseChapterId}
            onChange={(event) => setExerciseChapterId(event.target.value)}
          >
            <option value="">Select chapter</option>
            {chapterOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            data-testid="curriculum-exercise-type-select"
            value={exerciseType}
            onChange={(event) => setExerciseType(event.target.value as ExerciseType)}
          >
            {exerciseTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            data-testid="curriculum-exercise-difficulty-select"
            value={exerciseDifficulty}
            onChange={(event) => setExerciseDifficulty(event.target.value as ExerciseDifficulty)}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </Select>
          <Input
            data-testid="curriculum-exercise-number-input"
            value={exerciseNumber}
            onChange={(event) => setExerciseNumber(event.target.value)}
            placeholder="Exercise number (e.g. Q1)"
          />
          <Textarea
            data-testid="curriculum-exercise-question-input"
            value={exerciseQuestion}
            onChange={(event) => setExerciseQuestion(event.target.value)}
            className="min-h-28 resize-y"
            placeholder="Exercise question"
          />
          <Textarea
            data-testid="curriculum-exercise-solution-input"
            value={exerciseSolution}
            onChange={(event) => setExerciseSolution(event.target.value)}
            className="min-h-32 resize-y"
            placeholder="Step-by-step solution (Markdown and math supported)"
          />
          <p className="text-xs text-text-secondary">
            Numerical problems are available for Physics chapters.
          </p>
          <Button
            data-testid="curriculum-exercise-submit"
            type="submit"
            size="sm"
            variant="secondary"
            disabled={isSubmitting}
          >
            Add exercise
          </Button>
        </form>
      ) : (
        <div
          className="space-y-2 rounded-lg border border-border-default/60 bg-bg-base/50 p-3"
          data-testid="curriculum-exercise-manage"
        >
          <p className="text-sm font-semibold text-text-primary">
            Read / Update / Delete Exercises
          </p>
          <p className="text-xs text-text-secondary">
            {isExerciseListLoading
              ? "Loading exercises..."
              : `Loaded ${chapterExercises.length} exercise${chapterExercises.length === 1 ? "" : "s"} for selected chapter.`}
          </p>
          <Select
            data-testid="curriculum-exercise-manage-select"
            value={manageExerciseId}
            onChange={(event) => setManageExerciseId(event.target.value)}
            disabled={!exerciseChapterId || isExerciseListLoading}
          >
            <option value="">Select exercise</option>
            {chapterExercises.map((exercise) => (
              <option key={exercise.id} value={exercise.id}>
                {exercise.exerciseNumber}
              </option>
            ))}
          </Select>
          <Select
            data-testid="curriculum-exercise-manage-type-select"
            value={manageExerciseType}
            onChange={(event) => setManageExerciseType(event.target.value as ExerciseType)}
            disabled={!manageExerciseId}
          >
            {exerciseTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            data-testid="curriculum-exercise-manage-difficulty-select"
            value={manageExerciseDifficulty}
            onChange={(event) =>
              setManageExerciseDifficulty(event.target.value as ExerciseDifficulty)
            }
            disabled={!manageExerciseId}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </Select>
          <Input
            data-testid="curriculum-exercise-manage-number-input"
            value={manageExerciseNumber}
            onChange={(event) => setManageExerciseNumber(event.target.value)}
            placeholder="Exercise number"
            disabled={!manageExerciseId}
          />
          <Textarea
            data-testid="curriculum-exercise-manage-question-input"
            value={manageExerciseQuestion}
            onChange={(event) => setManageExerciseQuestion(event.target.value)}
            className="min-h-24 resize-y"
            placeholder="Exercise question"
            disabled={!manageExerciseId}
          />
          <Textarea
            data-testid="curriculum-exercise-manage-solution-input"
            value={manageExerciseSolution}
            onChange={(event) => setManageExerciseSolution(event.target.value)}
            className="min-h-24 resize-y"
            placeholder="Exercise solution"
            disabled={!manageExerciseId}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              data-testid="curriculum-exercise-manage-update"
              type="button"
              size="sm"
              variant="secondary"
              disabled={!manageExerciseId || isSubmitting}
              onClick={updateExercise}
            >
              Update exercise
            </Button>
            <Button
              data-testid="curriculum-exercise-manage-delete"
              type="button"
              size="sm"
              variant="secondary"
              disabled={!manageExerciseId || isSubmitting}
              onClick={deleteExercise}
            >
              Delete exercise
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

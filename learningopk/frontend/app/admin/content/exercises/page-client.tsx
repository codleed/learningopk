"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { AdminPageHeader } from "@/components/admin";
import { ContentTabs } from "@/components/admin/content-tabs";
import { ContentStatsStrip } from "@/components/admin/content-stats-strip";
import { ContentListTable, type ColumnDef } from "@/components/admin/content-list-table";
import { deleteAdminCurriculumExercise, type AdminCurriculumBoard, type AdminCurriculumExerciseRead } from "@/lib/admin-api";
import { useToast } from "@/components/ui/toast";

type ExerciseWithContext = AdminCurriculumExerciseRead & {
  boardName: string;
  className: string;
  subjectName: string;
  chapterTitle: string;
};

type ExercisesPageProps = {
  boards: AdminCurriculumBoard[];
  initialExercises: AdminCurriculumExerciseRead[];
  stats: {
    boards: number;
    classes: number;
    subjects: number;
    chapters: number;
    exercises: number;
    quizzes: number;
    flashcardDecks: number;
  };
};

const difficultyColors: Record<string, string> = {
  easy: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  hard: "bg-red-100 text-red-700",
};

const typeLabels: Record<string, string> = {
  mcq: "MCQ",
  short: "Short Answer",
  long: "Long Answer",
  numerical: "Numerical",
};

export function ExercisesPage({ boards, initialExercises, stats }: ExercisesPageProps) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [exercises] = useState<ExerciseWithContext[]>(
    initialExercises.map((ex) => {
      // Find the chapter context from boards
      for (const board of boards) {
        for (const boardClass of board.classes) {
          for (const subject of boardClass.subjects) {
            const chapter = subject.chapters.find((ch) => ch.id === ex.chapterId);
            if (chapter) {
              return {
                ...ex,
                boardName: board.name,
                className: boardClass.name,
                subjectName: subject.name,
                chapterTitle: chapter.title,
              };
            }
          }
        }
      }
      return {
        ...ex,
        boardName: "Unknown",
        className: "Unknown",
        subjectName: "Unknown",
        chapterTitle: "Unknown",
      };
    })
  );

  const columns: ColumnDef<ExerciseWithContext>[] = [
    {
      key: "exerciseNumber",
      header: "Exercise",
      render: (ex) => (
        <span className="font-medium text-[var(--text-primary)]">
          Exercise {ex.exerciseNumber}
        </span>
      ),
    },
    {
      key: "chapter",
      header: "Chapter",
      render: (ex) => (
        <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
          <span className="max-w-[200px] truncate">
            {ex.boardName} / {ex.className} / {ex.subjectName} / {ex.chapterTitle}
          </span>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (ex) => (
        <span className="text-[var(--text-primary)]">{typeLabels[ex.type] || ex.type}</span>
      ),
    },
    {
      key: "difficulty",
      header: "Difficulty",
      render: (ex) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            difficultyColors[ex.difficulty] || "bg-gray-100 text-gray-700"
          }`}
        >
          {ex.difficulty.charAt(0).toUpperCase() + ex.difficulty.slice(1)}
        </span>
      ),
    },
  ];

  const handleDelete = async (exercise: ExerciseWithContext) => {
    if (
      window.confirm(
        `Are you sure you want to delete Exercise ${exercise.exerciseNumber}? This action cannot be undone.`
      )
    ) {
      try {
        await deleteAdminCurriculumExercise(exercise.id);
        pushToast({
          title: "Exercise deleted",
          description: `Exercise ${exercise.exerciseNumber} has been deleted successfully.`,
          tone: "success",
        });
        router.refresh();
      } catch (error) {
        pushToast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to delete exercise",
          tone: "error",
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Content Management"
        subtitle="Manage boards, classes, subjects, chapters, exercises, quizzes, and flash cards"
      />

      <ContentStatsStrip stats={stats} />

      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)]">
        <ContentTabs />

        <div className="p-6">
          <ContentListTable
            title="Exercises"
            items={exercises}
            columns={columns}
            onDelete={handleDelete}
            editHref={(ex) => `/admin/content/exercises/${ex.id}/edit`}
            addHref="/admin/content/exercises/add"
            addLabel="Add Exercise"
            emptyMessage="No exercises found. Create your first exercise to get started."
            getItemId={(ex) => ex.id}
          />
        </div>
      </div>
    </div>
  );
}

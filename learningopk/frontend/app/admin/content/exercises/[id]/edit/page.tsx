import { notFound } from "next/navigation";
import { cookies } from "next/headers";

import {
  getAdminCurriculumTree,
  getAdminCurriculumExercises,
  type AdminCurriculumBoard,
} from "@/lib/admin-api";
import { EditExerciseForm } from "./edit-exercise-form";

interface EditExercisePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditExercisePage({ params }: EditExercisePageProps) {
  const { id } = await params;
  const exerciseId = parseInt(id, 10);

  if (isNaN(exerciseId)) {
    notFound();
  }

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  // Fetch curriculum tree and exercises in parallel
  const [boards, exercisesResponse] = await Promise.all([
    getAdminCurriculumTree(cookieHeader).catch(() => [] as AdminCurriculumBoard[]),
    getAdminCurriculumExercises({}).catch(() => ({ exercises: [] })),
  ]);

  // Find the exercise in the response
  const exercise = exercisesResponse.exercises.find((ex) => ex.id === exerciseId);

  if (!exercise) {
    notFound();
  }

  // Find the chapter context from boards
  let boardName = "Unknown";
  let className = "Unknown";
  let subjectName = "Unknown";
  let chapterTitle = "Unknown";

  for (const board of boards) {
    for (const boardClass of board.classes) {
      for (const subject of boardClass.subjects) {
        const chapter = subject.chapters.find((ch) => ch.id === exercise.chapterId);
        if (chapter) {
          boardName = board.name;
          className = boardClass.name;
          subjectName = subject.name;
          chapterTitle = chapter.title;
          break;
        }
      }
    }
  }

  return (
    <EditExerciseForm
      exercise={{
        ...exercise,
        boardName,
        className,
        subjectName,
        chapterTitle,
      }}
      boards={boards}
    />
  );
}

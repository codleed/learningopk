import { cookies } from "next/headers";

import { FormulasPage } from "./page-client";
import { getAdminCurriculumTree, getAdminFormulas } from "@/lib/admin-api";

export default async function FormulasPageRoute() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const [curriculumBoards, initialFormulas] = await Promise.all([
    getAdminCurriculumTree(cookieHeader).catch(() => []),
    getAdminFormulas({ cookieHeader }).catch(() => [])
  ]);

  const boardCount = curriculumBoards.length;
  const classCount = curriculumBoards.reduce((sum, board) => sum + board.classes.length, 0);
  const subjectCount = curriculumBoards.reduce(
    (sum, board) => sum + board.classes.reduce((cs, c) => cs + c.subjects.length, 0),
    0
  );
  const chapterCount = curriculumBoards.reduce(
    (sum, board) =>
      sum +
      board.classes.reduce(
        (cs, c) => cs + c.subjects.reduce((ss, s) => ss + s.chapters.length, 0),
        0
      ),
    0
  );

  return (
    <FormulasPage
      boards={curriculumBoards}
      initialFormulas={initialFormulas}
      stats={{
        boards: boardCount,
        classes: classCount,
        subjects: subjectCount,
        chapters: chapterCount,
        exercises: 0,
        quizzes: 0,
        flashcardDecks: 0,
      }}
    />
  );
}

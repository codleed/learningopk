import { cookies } from "next/headers";

import { FlashCardsPage } from "./page-client";
import { getAdminCurriculumTree } from "@/lib/admin-api";

export default async function FlashCardsPageRoute() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const curriculumBoards = await getAdminCurriculumTree(cookieHeader).catch(() => []);

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
    <FlashCardsPage
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

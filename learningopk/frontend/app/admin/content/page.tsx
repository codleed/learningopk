import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ContentDashboard } from "./content-dashboard";
import { getAdminContentAuditLogs, getAdminCurriculumTree } from "@/lib/admin-api";

export default async function AdminContentPage() {
  // Redirect to boards tab by default
  redirect("/admin/content/boards");

  /*
  // Keeping old dashboard code for reference - can be removed after migration
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const curriculumBoards = await getAdminCurriculumTree(cookieHeader).catch(() => []);
  const contentAuditLogs = await getAdminContentAuditLogs({
    page: 1,
    pageSize: 5,
    cookieHeader
  }).catch(() => ({
    entries: [],
    total: 0,
    page: 1,
    pageSize: 5,
    hasMore: false
  }));

  // Compute stats from curriculum tree
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
    <ContentDashboard
      boards={curriculumBoards}
      auditLogs={contentAuditLogs.entries}
      stats={{
        boards: boardCount,
        classes: classCount,
        subjects: subjectCount,
        chapters: chapterCount,
        exercises: 0, // TODO: Fetch from API
        quizzes: 0,   // TODO: Fetch from API
        flashcardDecks: 0, // TODO: Fetch from API
      }}
    />
  );
  */
}

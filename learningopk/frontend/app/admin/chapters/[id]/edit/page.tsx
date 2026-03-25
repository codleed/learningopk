import { notFound } from "next/navigation";
import { cookies } from "next/headers";

import {
  getAdminCurriculumTree,
  getAdminChapterSummary,
  type AdminCurriculumBoard,
  type AdminCurriculumChapter,
} from "@/lib/admin-api";
import { EditChapterForm } from "./edit-chapter-form";

interface EditChapterPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditChapterPage({ params }: EditChapterPageProps) {
  const { id } = await params;
  const chapterId = parseInt(id, 10);

  if (isNaN(chapterId)) {
    notFound();
  }

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  // Fetch curriculum tree and chapter summary in parallel
  const [curriculumBoards, chapterSummary] = await Promise.all([
    getAdminCurriculumTree(cookieHeader).catch(() => [] as AdminCurriculumBoard[]),
    getAdminChapterSummary(chapterId).catch(() => null),
  ]);

  // Find the chapter in the curriculum tree
  let chapter: AdminCurriculumChapter | undefined;
  let subjectName = "";
  let className = "";
  let boardName = "";

  for (const board of curriculumBoards) {
    for (const boardClass of board.classes) {
      for (const subject of boardClass.subjects) {
        const found = subject.chapters.find((c) => c.id === chapterId);
        if (found) {
          chapter = found;
          subjectName = subject.name;
          className = boardClass.name;
          boardName = board.name;
          break;
        }
      }
      if (chapter) break;
    }
    if (chapter) break;
  }

  // Also check if we got the chapter from the summary endpoint
  const summaryTitle = chapterSummary?.chapter.title ?? chapter?.title ?? "";

  if (!chapter && !chapterSummary) {
    notFound();
  }

  return (
    <EditChapterForm
      chapter={{
        id: chapterId,
        chapterNumber: chapter?.chapterNumber ?? 1,
        title: summaryTitle || chapter?.title || "",
        slug: chapter?.slug || "",
        subjectName,
        className,
        boardName,
      }}
      initialSummary={chapterSummary?.chapter.summary ?? ""}
    />
  );
}

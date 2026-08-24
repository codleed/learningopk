import { notFound } from "next/navigation";
import { cookies } from "next/headers";

import {
  getAdminCurriculumTree,
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

  const curriculumBoards = await getAdminCurriculumTree(cookieHeader).catch(
    () => [] as AdminCurriculumBoard[]
  );

  let chapter: AdminCurriculumChapter | undefined;
  let subjectName = "";
  let className = "";
  let boardName = "";
  let coverImageUrl: string | null = null;

  for (const board of curriculumBoards) {
    for (const boardClass of board.classes) {
      for (const subject of boardClass.subjects) {
        const found = subject.chapters.find((c) => c.id === chapterId);
        if (found) {
          chapter = found;
          subjectName = subject.name;
          className = boardClass.name;
          boardName = board.name;
          coverImageUrl = found.coverImageUrl ?? null;
          break;
        }
      }
      if (chapter) break;
    }
    if (chapter) break;
  }

  if (!chapter) {
    notFound();
  }

  return (
    <EditChapterForm
      chapter={{
        id: chapterId,
        chapterNumber: chapter.chapterNumber,
        title: chapter.title,
        slug: chapter.slug,
        subjectName,
        className,
        boardName,
        coverImageUrl,
      }}
    />
  );
}

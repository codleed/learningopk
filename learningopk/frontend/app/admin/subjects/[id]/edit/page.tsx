import { notFound } from "next/navigation";
import { cookies } from "next/headers";

import {
  getAdminCurriculumTree,
  type AdminCurriculumBoard,
  type AdminCurriculumSubject,
} from "@/lib/admin-api";
import { EditSubjectForm } from "./edit-subject-form";

interface EditSubjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditSubjectPage({ params }: EditSubjectPageProps) {
  const { id } = await params;
  const subjectId = parseInt(id, 10);

  if (isNaN(subjectId)) {
    notFound();
  }

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  // Fetch curriculum tree
  const curriculumBoards = await getAdminCurriculumTree(cookieHeader).catch(
    () => [] as AdminCurriculumBoard[]
  );

  // Find the subject in the curriculum tree
  let subject: AdminCurriculumSubject | undefined;
  let className = "";
  let boardName = "";

  for (const board of curriculumBoards) {
    for (const boardClass of board.classes) {
      const found = boardClass.subjects.find((s) => s.id === subjectId);
      if (found) {
        subject = found;
        className = boardClass.name;
        boardName = board.name;
        break;
      }
    }
    if (subject) break;
  }

  if (!subject) {
    notFound();
  }

  return (
    <EditSubjectForm
      subject={{
        id: subjectId,
        name: subject.name,
        slug: subject.slug,
        icon: subject.icon ?? null,
        description: subject.description ?? null,
        coverImageUrl: subject.coverImageUrl ?? null,
        className,
        boardName,
      }}
    />
  );
}
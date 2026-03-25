import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { getAdminCurriculumTree } from "@/lib/admin-api";
import { EditClassForm } from "./edit-class-form";

interface EditClassPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditClassPage({ params }: EditClassPageProps) {
  const { id } = await params;
  const classId = parseInt(id, 10);

  if (isNaN(classId)) {
    notFound();
  }

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const curriculumBoards = await getAdminCurriculumTree(cookieHeader).catch(() => []);

  // Find the class in the curriculum tree
  let classData: { id: number; name: string; slug: string; boardId: number; boardName: string } | null = null;

  for (const board of curriculumBoards) {
    const foundClass = board.classes.find((c) => c.id === classId);
    if (foundClass) {
      classData = {
        id: foundClass.id,
        name: foundClass.name,
        slug: foundClass.slug,
        boardId: board.id,
        boardName: board.name,
      };
      break;
    }
  }

  if (!classData) {
    notFound();
  }

  return <EditClassForm classData={classData} />;
}

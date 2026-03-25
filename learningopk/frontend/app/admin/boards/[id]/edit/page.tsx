import { cookies } from "next/navigation";
import { notFound } from "next/navigation";

import { getAdminCurriculumTree } from "@/lib/admin-api";
import { EditBoardForm } from "./edit-board-form";

interface EditBoardPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditBoardPage({ params }: EditBoardPageProps) {
  const { id } = await params;
  const boardId = parseInt(id, 10);

  if (isNaN(boardId)) {
    notFound();
  }

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const curriculumBoards = await getAdminCurriculumTree(cookieHeader).catch(() => []);
  const board = curriculumBoards.find((b) => b.id === boardId);

  if (!board) {
    notFound();
  }

  return <EditBoardForm board={board} />;
}
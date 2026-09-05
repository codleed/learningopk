import { cookies } from "next/headers";

import { getAdminCurriculumTree } from "@/lib/admin-api";
import { AddBoardForm } from "./add-board-form";

export default async function AddBoardPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  // Fetch curriculum tree to validate boards exist (optional validation)
  const curriculumBoards = await getAdminCurriculumTree(cookieHeader).catch(() => []);

  return <AddBoardForm />;
}

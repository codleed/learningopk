import { cookies } from "next/headers";

import { getAdminCurriculumTree } from "@/lib/admin-api";
import { AddChapterForm } from "./add-chapter-form";

export default async function AddChapterPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  // Fetch curriculum tree to get subject list
  const curriculumBoards = await getAdminCurriculumTree(cookieHeader).catch(() => []);

  return <AddChapterForm boards={curriculumBoards} />;
}

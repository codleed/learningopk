import { cookies } from "next/headers";

import { getAdminCurriculumTree } from "@/lib/admin-api";
import { AddSubjectForm } from "./add-subject-form";

export default async function AddSubjectPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  // Fetch curriculum tree to get class list
  const curriculumBoards = await getAdminCurriculumTree(cookieHeader).catch(() => []);

  return <AddSubjectForm boards={curriculumBoards} />;
}

import { cookies } from "next/headers";

import { getAdminCurriculumTree } from "@/lib/admin-api";
import { AddClassForm } from "./add-class-form";

export default async function AddClassPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  // Fetch curriculum tree to get board list
  const curriculumBoards = await getAdminCurriculumTree(cookieHeader).catch(() => []);

  return <AddClassForm boards={curriculumBoards} />;
}

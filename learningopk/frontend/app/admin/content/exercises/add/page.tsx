import { cookies } from "next/headers";

import { getAdminCurriculumTree, type AdminCurriculumBoard } from "@/lib/admin-api";
import { AddExerciseForm } from "./add-exercise-form";

export default async function AddExercisePage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const boards = await getAdminCurriculumTree(cookieHeader).catch(() => [] as AdminCurriculumBoard[]);

  return <AddExerciseForm boards={boards} />;
}

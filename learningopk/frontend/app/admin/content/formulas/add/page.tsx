import { cookies } from "next/headers";

import { FormulaForm } from "./formula-form";
import { getAdminCurriculumTree } from "@/lib/admin-api";

export default async function AddFormulaPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const boards = await getAdminCurriculumTree(cookieHeader).catch(() => []);

  return <FormulaForm boards={boards} />;
}

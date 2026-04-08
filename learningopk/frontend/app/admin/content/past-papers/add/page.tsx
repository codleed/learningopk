import { cookies } from "next/headers";

import { PastPaperForm } from "./past-paper-form";
import { getAdminCurriculumTree } from "@/lib/admin-api";

export default async function AddPastPaperPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const boards = await getAdminCurriculumTree(cookieHeader).catch(() => []);

  return <PastPaperForm boards={boards} />;
}

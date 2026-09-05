import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { PastPaperForm } from "../../add/past-paper-form";
import { getAdminCurriculumTree, getAdminPastPapers } from "@/lib/admin-api";

interface EditPastPaperPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPastPaperPage({ params }: EditPastPaperPageProps) {
  const { id } = await params;
  const paperId = parseInt(id, 10);

  if (isNaN(paperId)) {
    notFound();
  }

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const [boards, allPapers] = await Promise.all([
    getAdminCurriculumTree(cookieHeader).catch(() => []),
    getAdminPastPapers({ cookieHeader }).catch(() => []),
  ]);

  const paper = allPapers.find((p) => p.id === paperId);
  if (!paper) {
    notFound();
  }

  return <PastPaperForm boards={boards} existingPaper={paper} />;
}

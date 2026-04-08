import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { FormulaForm } from "../../add/formula-form";
import { getAdminCurriculumTree, getAdminFormulas } from "@/lib/admin-api";

interface EditFormulaPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditFormulaPage({ params }: EditFormulaPageProps) {
  const { id } = await params;
  const formulaId = parseInt(id, 10);

  if (isNaN(formulaId)) {
    notFound();
  }

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const [boards, allFormulas] = await Promise.all([
    getAdminCurriculumTree(cookieHeader).catch(() => []),
    getAdminFormulas({ cookieHeader }).catch(() => [])
  ]);

  const formula = allFormulas.find((f) => f.id === formulaId);
  if (!formula) {
    notFound();
  }

  return <FormulaForm boards={boards} existingFormula={formula} />;
}

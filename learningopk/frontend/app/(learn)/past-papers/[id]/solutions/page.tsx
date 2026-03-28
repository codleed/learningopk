import { redirect } from "next/navigation";

import { AppShell } from "@/components/foundation/app-shell";
import { MockExamSolutionsClient } from "./solutions-client";
import { getServerSession } from "@/lib/session";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MockExamSolutionsPage({ params }: PageProps) {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  const { id } = await params;
  const examId = parseInt(id, 10);

  if (isNaN(examId) || examId <= 0) {
    redirect("/past-papers");
  }

  return (
    <AppShell
      session={session}
      currentPath="/past-papers"
      contentClassName="max-w-[96rem] px-3 pb-10 pt-3 sm:px-5 lg:px-6"
    >
      <MockExamSolutionsClient examId={examId} />
    </AppShell>
  );
}

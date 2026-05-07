import { redirect } from "next/navigation";

import { AppShell } from "@/components/foundation/app-shell";
import { ResultsClient } from "./results-client";
import { getServerSession } from "@/lib/session";

interface PageProps {
  params: Promise<{ id: string; attemptId: string }>;
}

export default async function ResultsPage({ params }: PageProps) {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  const { id, attemptId } = await params;

  return (
    <AppShell
      session={session}
      currentPath="/past-papers"
      contentClassName="max-w-[96rem] px-3 pb-10 pt-3 sm:px-5 lg:px-6"
    >
      <ResultsClient paperId={id} attemptId={attemptId} />
    </AppShell>
  );
}

import { redirect } from "next/navigation";

import { AppShell } from "@/components/foundation/app-shell";
import { AttemptClient } from "./attempt-client";
import { getServerSession } from "@/lib/session";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AttemptPage({ params }: PageProps) {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  const { id } = await params;

  return (
    <AppShell
      session={session}
      currentPath="/past-papers"
      contentClassName="max-w-[96rem] px-0 pb-10 pt-0"
    >
      <AttemptClient paperId={id} />
    </AppShell>
  );
}

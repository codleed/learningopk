import { redirect } from "next/navigation";

import { AppShell } from "@/components/foundation/app-shell";
import { SolutionsClient } from "./solutions-client";
import { getServerSession } from "@/lib/session";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function SolutionsPage({ params }: Props) {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  const { id } = await params;

  return (
    <AppShell
      session={session}
      currentPath="/past-papers"
      contentClassName="max-w-[96rem] px-3 pb-10 pt-3 sm:px-5 lg:px-6"
    >
      <SolutionsClient mockExamId={parseInt(id, 10)} />
    </AppShell>
  );
}

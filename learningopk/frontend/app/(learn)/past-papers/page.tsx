import { redirect } from "next/navigation";

import { AppShell } from "@/components/foundation/app-shell";
import { PastPapersClient } from "./past-papers-client";
import { getServerSession } from "@/lib/session";

export default async function PastPapersPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <AppShell
      session={session}
      currentPath="/past-papers"
      contentClassName="max-w-[96rem] px-3 pb-10 pt-3 sm:px-5 lg:px-6"
    >
      <PastPapersClient />
    </AppShell>
  );
}

import { redirect } from "next/navigation";

import { AppShell } from "@/components/foundation/app-shell";
import { AITutorChat } from "@/components/ai/ai-tutor-chat";
import { getServerSession } from "@/lib/session";

export default async function AITutorPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <AppShell
      session={session}
      currentPath="/ai-tutor"
      contentClassName="max-w-[95rem] px-3 pb-10 pt-4 sm:px-5 lg:px-7"
    >
      <AITutorChat />
    </AppShell>
  );
}

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
      className="bg-background"
      contentClassName="max-w-none px-0 pb-0 pt-0"
    >
      <AITutorChat />
    </AppShell>
  );
}

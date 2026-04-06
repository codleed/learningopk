import { redirect } from "next/navigation";

import { AppShell } from "@/components/foundation/app-shell";
import { AIUnifiedChat } from "@/components/ai/ai-unified-chat";
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
      className="bg-bg-base"
      contentClassName="max-w-none px-0 pb-0 pt-0"
    >
      <AIUnifiedChat mode="full-page" />
    </AppShell>
  );
}

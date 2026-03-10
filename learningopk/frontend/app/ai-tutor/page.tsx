import { redirect } from "next/navigation";

import { AppShell } from "@/components/foundation/app-shell";
import {
  StaggerContainer,
  MotionSection,
} from "@/components/dashboard/DashboardClient";
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
      contentClassName="max-w-[96rem] px-3 pb-10 pt-3 sm:px-5 lg:px-6"
    >
      <StaggerContainer className="space-y-6">
          <MotionSection>
            <AITutorChat />
          </MotionSection>
        </StaggerContainer>
    </AppShell>
  );
}

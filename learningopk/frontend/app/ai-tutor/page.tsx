import { redirect } from "next/navigation";

import { DashboardChromeHeader, DashboardChromeLayout } from "@/components/dashboard/dashboard-chrome-layout";
import { AITutorChat } from "@/components/ai/ai-tutor-chat";
import { getServerSession } from "@/lib/session";

export default async function AITutorPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <DashboardChromeLayout
      session={session}
      currentPath="/ai-tutor"
      header={
        <DashboardChromeHeader
          eyebrow="AI"
          title="AI Tutor"
          subtitle="Get general learning support, concept clarity, and exam-focused study guidance."
        />
      }
    >
      <AITutorChat />
    </DashboardChromeLayout>
  );
}

import { redirect } from "next/navigation";

import { DashboardSettingsPanel } from "@/components/dashboard/dashboard-settings-panel";
import { AppShell } from "@/components/foundation/app-shell";
import { DashboardSurface } from "@/components/foundation/dashboard-primitives";
import { getServerSession } from "@/lib/session";

export default async function SettingsPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  const settingsProfile = {
    name: session.user.name,
    studentClass: session.user.class ?? "",
    degree: session.user.degree ?? "",
    board: session.user.board ?? "",
  };

  return (
    <AppShell
      session={session}
      currentPath="/settings"
      contentClassName="max-w-[95rem] px-3 pb-10 pt-4 sm:px-5 lg:px-7"
    >
      <DashboardSurface as="section" tone="shell" className="p-3 sm:p-4 lg:p-5">
        <DashboardSettingsPanel initialProfile={settingsProfile} />
      </DashboardSurface>
    </AppShell>
  );
}

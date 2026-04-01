import { redirect } from "next/navigation";

import { AppShell } from "@/components/foundation/app-shell";
import { getServerSession } from "@/lib/session";
import { SettingsPageClient } from "@/components/settings/settings-page-client";

export default async function SettingsPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  const settingsProfile = {
    name: session.user.name,
    email: session.user.email,
    image: session.user.image ?? null,
    studentClass: session.user.class ?? "",
    degree: session.user.degree ?? "",
    board: session.user.board ?? "",
  };

  return (
    <AppShell
      session={session}
      currentPath="/settings"
      contentClassName="max-w-[80rem] mx-auto px-4 pb-12 pt-6 sm:px-6 lg:px-8"
    >
      <SettingsPageClient initialProfile={settingsProfile} />
    </AppShell>
  );
}

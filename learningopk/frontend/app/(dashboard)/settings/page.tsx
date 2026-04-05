import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { AppShell } from "@/components/foundation/app-shell";
import { getLeaderboardSettings } from "@/lib/leaderboard-api";
import { getServerSession } from "@/lib/session";
import { SettingsPageClient } from "@/components/settings/settings-page-client";

export default async function SettingsPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const leaderboard = await getLeaderboardSettings(cookieStore.toString()).catch(() => ({
    leaderboardPublic: true,
    badge: null
  }));

  const settingsProfile = {
    name: session.user.name,
    email: session.user.email,
    image: session.user.image ?? null,
    studentClass: session.user.class ?? "",
    degree: session.user.degree ?? "",
    board: session.user.board ?? "",
    leaderboard,
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

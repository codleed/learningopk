import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/common/page-header";
import { StudyGroupsPanel } from "@/components/dashboard/study-groups-panel";
import { AppShell } from "@/components/foundation/app-shell";
import { getServerSession } from "@/lib/session";
import { getStudyGroups } from "@/lib/study-groups-api";

export default async function StudyGroupsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  const cookieStore = await cookies();
  const groupsResult = await getStudyGroups(cookieStore.toString()).catch(() => ({ groups: [] }));

  return (
    <AppShell session={session} currentPath="/dashboard/groups" contentClassName="max-w-7xl mx-auto px-4 pb-10 pt-4 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <PageHeader title="Study groups" subtitle="Build a focused accountability circle with shared progress and async achievement alerts." breadcrumbs={[{ label: "Home", href: "/" }, { label: "Dashboard", href: "/dashboard" }, { label: "Study groups" }]} />
        <StudyGroupsPanel groups={groupsResult.groups} />
      </div>
    </AppShell>
  );
}

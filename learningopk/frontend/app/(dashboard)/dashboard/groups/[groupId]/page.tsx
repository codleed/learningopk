import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/common/page-header";
import { StudyGroupDetailClient } from "@/components/dashboard/study-group-detail-client";
import { AppShell } from "@/components/foundation/app-shell";
import { getServerSession } from "@/lib/session";
import { getStudyGroupDetail } from "@/lib/study-groups-api";

export default async function StudyGroupDetailPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const session = await getServerSession();
  if (!session) redirect("/login");
  const { groupId } = await params;
  const cookieStore = await cookies();
  const payload = await getStudyGroupDetail(groupId, cookieStore.toString());
  if (!payload) notFound();

  return (
    <AppShell
      session={session}
      currentPath="/dashboard/groups"
      contentClassName="max-w-7xl mx-auto px-4 pb-10 pt-4 sm:px-6 lg:px-8"
    >
      <div className="space-y-6">
        <PageHeader
          sticky
          stickyClassName="-mx-4 -mt-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8"
          title={payload.group.name}
          subtitle="Shared member progress, async chapter updates, and score rivalry notifications."
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "Dashboard", href: "/dashboard" },
            { label: "Study groups", href: "/dashboard/groups" },
            { label: payload.group.name },
          ]}
        />
        <StudyGroupDetailClient payload={payload} />
      </div>
    </AppShell>
  );
}

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/foundation/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { getServerSession } from "@/lib/session";
import { getClassrooms } from "@/lib/teacher-api";
import { TeacherDashboardClient } from "@/components/teacher/teacher-dashboard-client";

export default async function TeacherPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  if (session.user.role !== "teacher") redirect("/dashboard");

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const classrooms = await getClassrooms(cookieHeader).catch(() => []);

  return (
    <AppShell
      session={session}
      currentPath="/teacher"
      contentClassName="max-w-6xl mx-auto px-5 pb-10 pt-4 sm:px-8 lg:px-10"
    >
      <div className="mb-6">
        <PageHeader
          sticky
          stickyClassName="-mx-5 -mt-4 sm:-mx-8 lg:-mx-10 px-5 sm:px-8 lg:px-10"
          title="Teacher Dashboard"
          subtitle="Manage your classrooms, students, and assignments."
          breadcrumbs={[{ label: "Home", href: "/" }, { label: "Teacher Dashboard" }]}
        />
      </div>

      <TeacherDashboardClient initialClassrooms={classrooms ?? []} />
    </AppShell>
  );
}

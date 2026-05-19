import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";

import { AppShell } from "@/components/foundation/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { getServerSession } from "@/lib/session";
import { getClassroomById, getStudents, getAssignments, getAnnouncements } from "@/lib/teacher-api";
import { ClassroomDetailClient } from "@/components/teacher/classroom-detail-client";

type Props = {
  params: Promise<{ classroomId: string }>;
};

export default async function ClassroomDetailPage({ params }: Props) {
  const session = await getServerSession();
  if (!session) redirect("/login");
  if (session.user.role !== "teacher") redirect("/dashboard");

  const { classroomId: classroomIdParam } = await params;
  const classroomId = parseInt(classroomIdParam, 10);
  if (isNaN(classroomId)) notFound();

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const [classroom, students, assignments, announcements] = await Promise.allSettled([
    getClassroomById(classroomId, cookieHeader),
    getStudents(classroomId, cookieHeader),
    getAssignments(classroomId, cookieHeader),
    getAnnouncements(classroomId, cookieHeader),
  ]);

  const classroomData = classroom.status === "fulfilled" ? classroom.value : null;
  if (!classroomData) notFound();

  // Ensure teacher owns this classroom
  if (classroomData.teacherId !== session.user.id) redirect("/teacher");

  return (
    <AppShell
      session={session}
      currentPath={`/teacher/${classroomId}`}
      contentClassName="max-w-6xl mx-auto px-5 pb-10 pt-4 sm:px-8 lg:px-10"
    >
      <div className="mb-6">
        <PageHeader
          sticky
          stickyClassName="-mx-5 -mt-4 sm:-mx-8 lg:-mx-10 px-5 sm:px-8 lg:px-10"
          title={classroomData.name}
          subtitle={`Grade ${classroomData.grade} • Invite code: ${classroomData.inviteCode}`}
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "Teacher Dashboard", href: "/teacher" },
            { label: classroomData.name },
          ]}
        />
      </div>

      <ClassroomDetailClient
        classroom={classroomData}
        initialStudents={students.status === "fulfilled" ? students.value ?? [] : []}
        initialAssignments={assignments.status === "fulfilled" ? assignments.value ?? [] : []}
        initialAnnouncements={announcements.status === "fulfilled" ? announcements.value ?? [] : []}
      />
    </AppShell>
  );
}

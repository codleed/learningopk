import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/foundation/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { getServerSession } from "@/lib/session";
import { getMyClassroom, getMyAssignments, getMyAnnouncements } from "@/lib/teacher-api";
import { StudentClassroomClient } from "@/components/teacher/student-classroom-client";

export default async function MyClassroomPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  if (session.user.role !== "student") redirect("/dashboard");

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const classroom = await getMyClassroom(cookieHeader).catch(() => null);

  let assignments: Array<{
    id: number;
    title: string;
    type: "chapter" | "quiz" | "mock_exam";
    dueDate: string | null;
    points: number;
    status?: "not_started" | "in_progress" | "submitted";
    score?: number | null;
  }> = [];
  let announcements: Array<{
    id: number;
    content: string;
    pinned: boolean;
    createdAt: string;
  }> = [];

  if (classroom) {
    const [a, an] = await Promise.allSettled([
      getMyAssignments(classroom.id, cookieHeader),
      getMyAnnouncements(classroom.id, cookieHeader),
    ]);
    assignments = a.status === "fulfilled" ? (a.value ?? []) : [];
    announcements = an.status === "fulfilled" ? (an.value ?? []) : [];
  }

  return (
    <AppShell
      session={session}
      currentPath="/student/my-classroom"
      contentClassName="max-w-6xl mx-auto px-5 pb-10 pt-4 sm:px-8 lg:px-10"
    >
      <div className="mb-6">
        <PageHeader
          sticky
          stickyClassName="-mx-5 -mt-4 sm:-mx-8 lg:-mx-10 px-5 sm:px-8 lg:px-10"
          title="My Classroom"
          subtitle={
            classroom ? `Your class: ${classroom.name}` : "Join a classroom to get started."
          }
          breadcrumbs={[{ label: "Home", href: "/" }, { label: "My Classroom" }]}
        />
      </div>

      <StudentClassroomClient
        classroom={classroom}
        initialAssignments={assignments}
        initialAnnouncements={announcements}
      />
    </AppShell>
  );
}

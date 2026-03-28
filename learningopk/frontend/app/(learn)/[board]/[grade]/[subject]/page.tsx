import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { AppShell } from "@/components/foundation/app-shell";
import { DashboardSection, DashboardSurface } from "@/components/foundation/dashboard-primitives";
import {
  StaggerContainer,
  MotionSection,
} from "@/components/dashboard/DashboardClient";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { SubjectHeader } from "@/components/learn/subject-header";
import { SubjectViewSwitcher } from "@/components/learn/subject-view-switcher";
import { getSubjectOverview } from "@/lib/learn-api";
import { getServerSession } from "@/lib/session";

const routeParamsSchema = z.object({
  board: z.string().trim().regex(/^[a-z0-9-]+$/),
  grade: z.string().trim().regex(/^[a-z0-9-]+$/),
  subject: z.string().trim().regex(/^[a-z0-9-]+$/)
});

type SubjectPageProps = {
  params: Promise<{
    board: string;
    grade: string;
    subject: string;
  }>;
  searchParams: Promise<{ mockExamId?: string }>;
};

export default async function SubjectPage({ params, searchParams }: SubjectPageProps) {
  const query = await searchParams;
  if (query.mockExamId) {
    const examId = parseInt(query.mockExamId, 10);
    if (!isNaN(examId) && examId > 0) {
      redirect(`/past-papers/${examId}/solutions`);
    }
  }
  const session = await getServerSession();
  const routeParams = routeParamsSchema.safeParse(await params);
  if (!routeParams.success) {
    notFound();
  }
  if (session?.user.role === "student") {
    if (session.user.board && session.user.board !== routeParams.data.board) {
      notFound();
    }
    if (session.user.class && session.user.class !== routeParams.data.grade) {
      notFound();
    }
  }

  const payload = await getSubjectOverview(routeParams.data);
  if (!payload) {
    notFound();
  }

  return (
    <AppShell
      session={session}
      currentPath={`/${payload.board.slug}/${payload.class.slug}/${payload.subject.slug}`}
      contentClassName="max-w-[96rem] px-3 pb-10 pt-3 sm:px-5 lg:px-6"
    >
      <div className="rounded-[1.6rem] bg-[var(--secondary)] p-4 sm:p-6 lg:p-8">
        <StaggerContainer className="space-y-6">
          <MotionSection>
            <Breadcrumbs
              items={[
                { label: "Dashboard", href: "/dashboard" },
                { label: "Subjects", href: "/subjects" },
                { label: payload.subject.name },
              ]}
              className="mb-4"
            />
            <SubjectHeader board={payload.board} className={payload.class.name} subject={payload.subject} />
          </MotionSection>

          <MotionSection>
            <DashboardSurface as="section" tone="shell" className="space-y-4 p-4 sm:p-5">
              <DashboardSection
                title="Chapters"
                actions={
                  <Link href="/dashboard" className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--primary)] underline underline-offset-4">
                    View dashboard
                  </Link>
                }
                contentClassName="space-y-3"
              >
                <SubjectViewSwitcher
                  boardSlug={payload.board.slug}
                  classSlug={payload.class.slug}
                  subjectSlug={payload.subject.slug}
                  chapters={payload.chapters}
                  showGraph={session?.user.role === "student"}
                />
              </DashboardSection>
            </DashboardSurface>
          </MotionSection>
        </StaggerContainer>
      </div>
    </AppShell>
  );
}

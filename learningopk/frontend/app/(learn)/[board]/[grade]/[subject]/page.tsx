import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { AppShell } from "@/components/foundation/app-shell";
import { DashboardSection, DashboardSurface } from "@/components/foundation/dashboard-primitives";
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
};

export default async function SubjectPage({ params }: SubjectPageProps) {
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
      contentClassName="max-w-[95rem] px-3 pb-10 pt-4 sm:px-5 lg:px-7"
    >
      <DashboardSurface as="section" tone="shell" className="space-y-4 p-4 sm:p-5">
        <DashboardSurface as="div" tone="hero" className="p-1">
          <SubjectHeader board={payload.board} className={payload.class.name} subject={payload.subject} />
        </DashboardSurface>

        <DashboardSection
          title="Chapters"
          actions={
            <Link href="/dashboard" className="text-xs font-semibold uppercase tracking-[0.06em] text-primary underline underline-offset-4">
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
    </AppShell>
  );
}

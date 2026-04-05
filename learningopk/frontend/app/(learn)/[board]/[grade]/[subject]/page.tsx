import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { AppShell } from "@/components/foundation/app-shell";
import {
  StaggerContainer,
  MotionSection,
} from "@/components/dashboard/DashboardClient";
import { PageHeader } from "@/components/common/page-header";
import { SubjectHeader } from "@/components/learn/subject-header";
import { SubjectWeightageList } from "@/components/learn/subject-weightage-list";
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
      <StaggerContainer className="space-y-6">
        {/* Breadcrumbs + Subject Header */}
        <MotionSection>
          <PageHeader
            title=""
            breadcrumbs={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Subjects", href: "/subjects" },
              { label: payload.subject.name },
            ]}
          />
        </MotionSection>

        <MotionSection>
          <SubjectHeader
            board={payload.board}
            className={payload.class.name}
            subject={payload.subject}
            chapterCount={payload.chapters.length}
          />
        </MotionSection>

        {/* Chapters section */}
        <MotionSection>
          <div className="rounded-xl border border-border-default bg-bg-surface p-4 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-[var(--font-display)] text-lg font-semibold text-text-primary">Board exam weightage</h2>
                <p className="mt-0.5 text-sm text-text-secondary">Chapters sorted by recurring exam importance.</p>
              </div>
              <Link
                href={`/patterns/${payload.board.slug}/${payload.subject.slug}?grade=${payload.class.slug}`}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-accent-primary transition-colors hover:bg-accent-primary/5"
              >
                View patterns
              </Link>
            </div>

            <SubjectWeightageList
              boardSlug={payload.board.slug}
              classSlug={payload.class.slug}
              subjectSlug={payload.subject.slug}
              chapters={payload.chapters}
              recommendation={payload.recommendation}
            />
          </div>
        </MotionSection>

        <MotionSection>
          <div className="rounded-xl border border-border-default bg-bg-surface p-4 sm:p-6">
            {/* Section header */}
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-[var(--font-display)] text-lg font-semibold text-text-primary">
                  Chapters
                </h2>
                <p className="mt-0.5 text-sm text-text-secondary">
                  {payload.chapters.length}{" "}
                  {payload.chapters.length === 1 ? "chapter" : "chapters"} available
                </p>
              </div>
              <Link
                href="/dashboard"
                className="rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-accent-primary transition-colors hover:bg-accent-primary/5"
              >
                View dashboard
              </Link>
            </div>

            {/* Chapter list / graph switcher */}
            <SubjectViewSwitcher
              boardSlug={payload.board.slug}
              classSlug={payload.class.slug}
              subjectSlug={payload.subject.slug}
              chapters={payload.chapters}
              showGraph={session?.user.role === "student"}
            />
          </div>
        </MotionSection>
      </StaggerContainer>
    </AppShell>
  );
}

import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { AppShell } from "@/components/foundation/app-shell";
import { SubjectProgressTable } from "@/components/dashboard/subject-progress-table";
import { DashboardSection, DashboardSurface } from "@/components/foundation/dashboard-primitives";
import { getServerSession } from "@/lib/session";
import { getSubjectProgress } from "@/lib/progress-api";

type SubjectProgressPageProps = {
  params: Promise<{ boardSlug: string; grade: string; subjectSlug: string }>;
};

export default async function SubjectProgressPage({ params }: SubjectProgressPageProps) {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  const parsedParams = z
    .object({
      boardSlug: z
        .string()
        .trim()
        .regex(/^[a-z0-9-]+$/),
      grade: z.enum(["9", "10"]),
      subjectSlug: z
        .string()
        .trim()
        .regex(/^[a-z0-9-]+$/),
    })
    .safeParse(await params);

  if (!parsedParams.success) {
    notFound();
  }

  const cookieStore = await cookies();
  const { boardSlug, grade, subjectSlug } = parsedParams.data;
  const progress = await getSubjectProgress(boardSlug, grade, subjectSlug, cookieStore.toString());
  if (!progress) {
    notFound();
  }

  return (
    <AppShell
      session={session}
      currentPath={`/dashboard/${progress.subject.boardSlug}/${progress.subject.grade}/${progress.subject.slug}`}
      contentClassName="max-w-[95rem] px-3 pb-10 pt-4 sm:px-5 lg:px-7"
    >
      <DashboardSurface as="section" tone="shell" className="space-y-4 p-4 sm:p-5">
        <DashboardSurface as="header" tone="hero" className="px-5 py-6 sm:px-7">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--primary)]">
            {progress.subject.boardName} | Grade {progress.subject.grade}
          </p>
          <h1 className="mt-2 text-3xl font-medium text-text-primary sm:text-4xl">
            {progress.subject.name} Progress
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Overall subject score: {progress.overallSubjectScorePercent}%
          </p>
          <Link
            href="/dashboard"
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)] underline underline-offset-4"
          >
            Back to dashboard
          </Link>
        </DashboardSurface>

        <DashboardSection
          title="Chapter Progress"
          subtitle="Status colors: green passed, yellow attempted below threshold, grey not started."
          contentClassName="overflow-hidden"
        >
          <SubjectProgressTable chapters={progress.chapters} />
        </DashboardSection>
      </DashboardSurface>
    </AppShell>
  );
}

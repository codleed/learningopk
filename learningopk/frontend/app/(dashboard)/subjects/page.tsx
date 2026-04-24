import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowRight, Layers3 } from "lucide-react";

import { StudyCardArt } from "@/components/common/study-card-art";
import { AppShell } from "@/components/foundation/app-shell";
import {
  StaggerContainer,
  MotionSection,
  MotionCard,
} from "@/components/motion";
import { PageHeader } from "@/components/common/page-header";
import { BoardBadge } from "@/components/common/board-badge";
import { ProgressRing } from "@/components/common/progress-ring";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { getSubjectsList } from "@/lib/learn-api";
import { getDashboardSummary } from "@/lib/progress-api";
import { getServerSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "My Subjects | LearningoPK",
  description:
    "Browse and study your enrolled subjects. Access chapters, exercises, and quizzes.",
  openGraph: {
    title: "My Subjects | LearningoPK",
    description:
      "Browse and study your enrolled subjects. Access chapters, exercises, and quizzes.",
  },
};

export default async function SubjectsPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  const subjectsResult = await getSubjectsList()
    .then((data) => ({ data, error: null as string | null }))
    .catch((error: unknown) => ({
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "Unable to load subjects from database.",
    }));

  const progressBySubjectSlug = new Map<string, number>();
  try {
    const cookieStore = await cookies();
    const summary = await getDashboardSummary(cookieStore.toString());
    for (const subject of summary.subjects) {
      const current = progressBySubjectSlug.get(subject.subjectSlug) ?? 0;
      progressBySubjectSlug.set(
        subject.subjectSlug,
        Math.max(current, subject.chaptersVisitedPercent),
      );
    }
  } catch {
    // Subject list remains available even if progress API is unavailable.
  }

  const subjects =
    subjectsResult.data === null
      ? []
      : subjectsResult.data.subjects
          .filter((subject) => {
            if (!subject.classSlug) {
              return false;
            }

            if (session.user.role === "student") {
              const selectedBoard = session.user.board ?? "";
              const selectedClass = session.user.class ?? "";

              if (selectedBoard.length > 0 && subject.boardSlug !== selectedBoard) {
                return false;
              }

              if (selectedClass.length > 0 && subject.classSlug !== selectedClass) {
                return false;
              }
            }

            return true;
          })
          .map((subject) => {
            if (!subject.classSlug) {
              return null;
            }

            return {
              id: subject.id,
              slug: subject.slug,
              name: subject.name,
              className: subject.className ?? subject.classSlug,
              classSlug: subject.classSlug,
              boardName: subject.boardName,
              boardSlug: subject.boardSlug,
              progress: progressBySubjectSlug.get(subject.slug) ?? 0,
              coverImageUrl: subject.coverImageUrl,
            };
          })
          .filter((subject): subject is NonNullable<typeof subject> => subject !== null);

  return (
    <AppShell
      session={session}
      currentPath="/subjects"
      contentClassName="max-w-[96rem] px-3 pb-10 pt-3 sm:px-5 lg:px-6"
    >
      <PageHeader
        sticky
        stickyClassName="-mx-3 -mt-3 sm:-mx-5 lg:-mx-6 px-3 sm:px-5 lg:px-6"
        title="Subjects"
        subtitle="Browse and access chapters from your enrolled subjects."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Subjects" },
        ]}
      />

      <StaggerContainer className="space-y-8">
        {/* Error state */}
        {subjectsResult.error ? (
          <MotionSection>
            <ErrorState
              title="Subjects are temporarily unavailable"
              description={`${subjectsResult.error} Ensure backend is running on http://localhost:3001.`}
            />
          </MotionSection>
        ) : null}

        {/* Empty state */}
        {subjectsResult.error === null && subjects.length === 0 ? (
          <MotionSection>
            <EmptyState
              title="No subjects available"
              description="Seed or publish content, then refresh to load subject cards from the database."
            />
          </MotionSection>
        ) : null}

        {/* Subject grid */}
        {subjectsResult.error === null && subjects.length > 0 ? (
          <MotionSection>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {subjects.map((subject) => (
                <MotionCard key={subject.id}>
                  <Link
                    href={`/${subject.boardSlug}/${subject.classSlug}/${subject.slug}`}
                    className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40 focus-visible:ring-offset-2 rounded-xl"
                  >
                    <Card
                      variant="default"
                      className="group relative overflow-hidden"
                    >
                      <CardBody className="p-5 sm:p-6">
                        <div className="space-y-4">
                          <StudyCardArt
                            subject={subject.name}
                            title={`${subject.boardName} • Class ${subject.className}`}
                            coverImageUrl={subject.coverImageUrl}
                          />

                          <div className="flex items-start gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <BoardBadge board={subject.boardSlug} size="sm" />
                                <span className="inline-flex items-center gap-1 rounded-full bg-bg-base px-2 py-1 text-[0.6875rem] font-medium text-text-muted">
                                  <Layers3 className="h-3 w-3" aria-hidden />
                                  Class {subject.className}
                                </span>
                              </div>

                              <h2 className="mt-3 font-[var(--font-display)] text-[1.45rem] font-semibold tracking-tight text-text-primary">
                                {subject.name}
                              </h2>
                              <p className="mt-1 text-sm text-text-secondary">
                                Open chapter summaries, quizzes, flashcards, and practice flows.
                              </p>
                            </div>

                            <div className="shrink-0">
                              <ProgressRing
                                percentage={subject.progress}
                                size={52}
                                strokeWidth={4}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 rounded-2xl border border-border-default/70 bg-bg-base px-4 py-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-text-secondary">
                              {subject.progress}% complete
                            </span>
                            <span className="text-text-muted">Tracked coverage</span>
                          </div>
                          <div
                            role="progressbar"
                            aria-label={`${subject.name} progress`}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={subject.progress}
                            className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-bg-subtle"
                          >
                            <div
                              className="h-full rounded-full bg-accent-primary transition-all duration-500"
                              style={{ width: `${Math.max(subject.progress, 2)}%` }}
                            />
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t border-border-default/70 pt-4">
                          <div>
                            <p className="text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-text-muted">
                              Explore
                            </p>
                            <p className="mt-1 text-sm font-medium text-text-primary">Open chapters</p>
                          </div>

                          <div className="flex items-center gap-1.5 text-sm font-semibold text-accent-primary transition-colors group-hover:text-accent-primary-hover">
                            <span>Enter</span>
                            <ArrowRight
                              className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                              aria-hidden
                            />
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  </Link>
                </MotionCard>
              ))}
            </div>
          </MotionSection>
        ) : null}
      </StaggerContainer>
    </AppShell>
  );
}

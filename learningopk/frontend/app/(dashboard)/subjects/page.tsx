import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowRight } from "lucide-react";

import { AppShell } from "@/components/foundation/app-shell";
import {
  StaggerContainer,
  MotionSection,
  MotionCard,
} from "@/components/dashboard/DashboardClient";
import { PageHeader } from "@/components/common/page-header";
import { BoardBadge } from "@/components/common/board-badge";
import { ProgressRing } from "@/components/common/progress-ring";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { getSubjectsList } from "@/lib/learn-api";
import { getDashboardSummary } from "@/lib/progress-api";
import { getServerSession } from "@/lib/session";
import { cn } from "@/lib/utils";

const subjectIconBySlug: Record<string, string> = {
  physics: "/subjects/physics.svg",
  chemistry: "/subjects/chemistry.svg",
  biology: "/subjects/biology.svg",
  mathematics: "/subjects/math.svg",
  math: "/subjects/math.svg",
  science: "/subjects/science.svg",
  english: "/subjects/english.svg",
};

const resolveSubjectIcon = (subjectSlug: string): string =>
  subjectIconBySlug[subjectSlug] ?? "/subjects/science.svg";

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
              iconSrc: resolveSubjectIcon(subject.slug),
              progress: progressBySubjectSlug.get(subject.slug) ?? 0,
            };
          })
          .filter((subject): subject is NonNullable<typeof subject> => subject !== null);

  return (
    <AppShell
      session={session}
      currentPath="/subjects"
      contentClassName="max-w-[96rem] px-3 pb-10 pt-3 sm:px-5 lg:px-6"
    >
      <StaggerContainer className="space-y-8">
        {/* Header */}
        <MotionSection>
          <PageHeader
            title="Subjects"
            subtitle="Browse and access chapters from your enrolled subjects."
            breadcrumbs={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Subjects" },
            ]}
          />
        </MotionSection>

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
                      {/* Decorative accent line */}
                      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-accent-primary/60 via-accent-primary/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                      <CardBody className="p-5 sm:p-6">
                        <div className="flex items-start gap-4">
                          {/* Subject icon */}
                          <div
                            className={cn(
                              "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl",
                              "border border-border-default bg-bg-subtle",
                              "transition-colors duration-200 group-hover:border-accent-primary/20"
                            )}
                          >
                            <Image
                              src={subject.iconSrc}
                              alt={`${subject.name} icon`}
                              width={36}
                              height={36}
                              className="h-9 w-9"
                            />
                          </div>

                          {/* Subject info */}
                          <div className="min-w-0 flex-1">
                            <h2 className="font-[var(--font-display)] text-lg font-semibold tracking-tight text-text-primary">
                              {subject.name}
                            </h2>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              <BoardBadge board={subject.boardSlug} size="sm" />
                              <span className="text-[0.6875rem] font-medium text-text-muted">
                                Class {subject.className}
                              </span>
                            </div>
                          </div>

                          {/* Progress ring */}
                          <div className="shrink-0">
                            <ProgressRing
                              percentage={subject.progress}
                              size={48}
                              strokeWidth={4}
                            />
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-text-secondary">
                              {subject.progress}% complete
                            </span>
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

                        {/* CTA */}
                        <div className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-accent-primary transition-colors group-hover:text-accent-primary-hover">
                          <span>Open chapters</span>
                          <ArrowRight
                            className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                            aria-hidden
                          />
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

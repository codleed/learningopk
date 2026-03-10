import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { Star } from "@phosphor-icons/react/dist/ssr";

import { AppShell } from "@/components/foundation/app-shell";
import {
  StaggerContainer,
  MotionSection,
  MotionCard,
} from "@/components/dashboard/DashboardClient";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { getForumFilters } from "@/lib/forum-api";
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

const cardPalette = [
  { bg: "bg-[var(--pastel-dusty-rose)]/70", accent: "text-foreground" },
  { bg: "bg-[var(--pastel-warm-sand)]/70", accent: "text-foreground" },
  { bg: "bg-[var(--pastel-sage)]/70", accent: "text-foreground" },
  { bg: "bg-[var(--pastel-lavender)]/70", accent: "text-foreground" },
];

export default async function SubjectsPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  const filtersResult = await getForumFilters()
    .then((filters) => ({ filters, error: null as string | null }))
    .catch((error: unknown) => ({
      filters: null,
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
    filtersResult.filters === null
      ? []
      : filtersResult.filters.subjects
          .filter((subject) => {
            const board = filtersResult.filters?.boards.find((entry) => entry.id === subject.boardId);
            if (!board) {
              return false;
            }

            if (session.user.role === "student") {
              const selectedBoard = session.user.board ?? "";
              const selectedClass = session.user.class ?? "";

              if (selectedBoard.length > 0 && board.slug !== selectedBoard) {
                return false;
              }

              if (selectedClass.length > 0 && subject.classSlug !== selectedClass) {
                return false;
              }
            }

            return true;
          })
          .map((subject) => {
            const board = filtersResult.filters?.boards.find(
              (entry) => entry.id === subject.boardId,
            );
            if (!board || !subject.classSlug) {
              return null;
            }

            return {
              id: subject.id,
              slug: subject.slug,
              name: subject.name,
              className: subject.className ?? subject.classSlug,
              classSlug: subject.classSlug,
              boardName: board.name,
              boardSlug: board.slug,
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
          <MotionSection>
            <h1 className="text-4xl font-semibold leading-[1.15] tracking-[-0.02em] text-foreground sm:text-5xl lg:text-[3.4rem]">
              Your Subjects
            </h1>
            <p className="mt-3 text-sm text-foreground/60">
              Browse and access chapters from your enrolled subjects.
            </p>
          </MotionSection>

          {filtersResult.error ? (
            <MotionSection>
              <ErrorState
                title="Subjects are temporarily unavailable"
                description={`${filtersResult.error} Ensure backend is running on http://localhost:3001.`}
              />
            </MotionSection>
          ) : null}

          {filtersResult.error === null && subjects.length === 0 ? (
            <MotionSection>
              <EmptyState
                title="No subjects available"
                description="Seed or publish content, then refresh to load subject cards from the database."
              />
            </MotionSection>
          ) : null}

          {filtersResult.error === null && subjects.length > 0 ? (
            <MotionSection>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {subjects.map((subject, index) => {
                  const palette = cardPalette[index % cardPalette.length];
                  return (
                    <MotionCard key={subject.id}>
                      <Link
                        href={`/${subject.boardSlug}/${subject.classSlug}/${subject.slug}`}
                        className="block"
                      >
                        <article
                          className={cn(
                            palette.bg,
                            "rounded-2xl p-5 transition-shadow hover:shadow-lg",
                          )}
                        >
                          <div className="flex items-start gap-4">
                            <Image
                              src={subject.iconSrc}
                              alt={`${subject.name} icon`}
                              width={64}
                              height={64}
                              className="h-16 w-16 shrink-0 rounded-xl border border-white/40 bg-white/50 p-1"
                            />
                            <div className="min-w-0 flex-1">
                              <h2 className="text-lg font-semibold text-[#1a1a1a]">
                                {subject.name}
                              </h2>
                              <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.08em] text-[#1a1a1a]/60">
                                {subject.boardName} | Class {subject.className}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-[#1a1a1a]/70">
                                {subject.progress}% complete
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-white/50 px-2 py-0.5 text-xs font-bold text-[#1a1a1a]">
                                <Star
                                  className="h-3 w-3 text-amber-500"
                                  weight="fill"
                                  aria-hidden
                                />
                                {Math.min(5, Math.max(1, 3 + subject.progress / 25)).toFixed(1)}
                              </span>
                            </div>
                            <div
                              role="progressbar"
                              aria-label={`${subject.name} progress`}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={subject.progress}
                              className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/50"
                            >
                              <span
                                className="block h-full rounded-full bg-[#1a1a1a]/20"
                                style={{ width: `${Math.max(subject.progress, 4)}%` }}
                              />
                            </div>
                            <p className="mt-3 text-sm font-semibold text-[#1a1a1a]">
                              Open chapters →
                            </p>
                          </div>
                        </article>
                      </Link>
                    </MotionCard>
                  );
                })}
              </div>
            </MotionSection>
          ) : null}
        </StaggerContainer>
    </AppShell>
  );
}

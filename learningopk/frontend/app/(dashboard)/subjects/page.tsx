import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";

import { AppShell } from "@/components/foundation/app-shell";
import {
  DashboardCard,
  DashboardSurface,
} from "@/components/foundation/dashboard-primitives";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { getForumFilters } from "@/lib/forum-api";
import { getDashboardSummary } from "@/lib/progress-api";
import { getServerSession } from "@/lib/session";

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
      contentClassName="max-w-[95rem] px-3 pb-10 pt-4 sm:px-5 lg:px-7"
    >
      <DashboardSurface as="section" tone="shell" className="space-y-4 p-3 sm:p-4 lg:p-5">
        <DashboardSurface as="header" tone="header" className="px-4 py-4 sm:px-6">
          <h1 className="text-3xl font-medium tracking-tight text-foreground">Subjects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse subjects and open chapters from seeded database content.
          </p>
        </DashboardSurface>

        {filtersResult.error ? (
          <ErrorState
            title="Subjects are temporarily unavailable"
            description={`${filtersResult.error} Ensure backend is running on http://localhost:3001.`}
          />
        ) : null}

        {filtersResult.error === null && subjects.length === 0 ? (
          <EmptyState
            title="No subjects available"
            description="Seed or publish content, then refresh to load subject cards from the database."
          />
        ) : null}

        {filtersResult.error === null && subjects.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {subjects.map((subject) => (
              <DashboardCard
                key={subject.id}
                as={Link}
                href={`/${subject.boardSlug}/${subject.classSlug}/${subject.slug}`}
                aria-label={`Open ${subject.name} chapters`}
                className="space-y-3 p-4 transition hover:-translate-y-0.5 hover:border-primary/45"
              >
                <div className="flex items-center gap-3">
                  <Image
                    src={subject.iconSrc}
                    alt={`${subject.name} icon`}
                    width={64}
                    height={64}
                    className="h-16 w-16 rounded-xl border border-border bg-card p-1"
                  />
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">{subject.name}</h2>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      {subject.boardName} | Class {subject.className}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{subject.progress}% complete</p>
                <div
                  role="progressbar"
                  aria-label={`${subject.name} progress`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={subject.progress}
                  className="h-2 w-full overflow-hidden rounded-full bg-muted"
                >
                  <span
                    className="block h-full rounded-full bg-primary"
                    style={{ width: `${Math.max(subject.progress, 4)}%` }}
                  />
                </div>
                <p className="text-sm font-medium text-primary">Open chapters</p>
              </DashboardCard>
            ))}
          </div>
        ) : null}
      </DashboardSurface>
    </AppShell>
  );
}

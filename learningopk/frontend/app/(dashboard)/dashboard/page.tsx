import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  DashboardClient,
} from "@/components/dashboard/DashboardClient";
import { AppShell } from "@/components/foundation/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { getForumFilters } from "@/lib/forum-api";
import { getSubjectOverview } from "@/lib/learn-api";
import {
  getDashboardSummary,
  type DashboardSummaryResponse,
} from "@/lib/progress-api";
import { getServerSession } from "@/lib/session";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type LearnRouteSeed = {
  boardSlug: string;
  classSlug: string;
  subjectSlug: string;
};

type DashboardPageSearchParams = {
  q?: string | string[];
  filter?: string | string[];
  rail?: string | string[];
};

type DashboardPageProps = {
  searchParams: Promise<DashboardPageSearchParams>;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const getInitials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

const getFirstQueryValue = (
  value: string | string[] | undefined
): string | undefined => {
  if (Array.isArray(value)) return value[0];
  return value;
};

/* ------------------------------------------------------------------ */
/*  Page (Server Component)                                            */
/* ------------------------------------------------------------------ */

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const parsedSearchParams = await searchParams;
  const requestedRail = getFirstQueryValue(parsedSearchParams.rail);
  if (requestedRail === "settings") redirect("/settings");

  /* ---- data ---- */
  const cookieStore = await cookies();
  const summaryResult = await getDashboardSummary(cookieStore.toString())
    .then((data) => ({ summary: data, summaryError: null as string | null }))
    .catch((error: unknown) => ({
      summary: null as DashboardSummaryResponse | null,
      summaryError:
        error instanceof Error
          ? error.message
          : "Unable to load progress dashboard.",
    }));

  const { summary, summaryError } = summaryResult;
  const subjects = summary?.subjects ?? [];
  const orderedSubjects = [...subjects].sort(
    (a, b) =>
      b.chaptersVisitedPercent - a.chaptersVisitedPercent ||
      b.bestQuizScorePercent - a.bestQuizScorePercent
  );
  const featuredSubject = orderedSubjects[0] ?? null;

  const displayName =
    summary && summary.studentName.trim().length > 0
      ? summary.studentName
      : session.user.name;

  /* ---- route seed (resolve "Continue Learning" link) ---- */
  let routeSeed: LearnRouteSeed | null = null;
  try {
    const filters = await getForumFilters();
    if (featuredSubject) {
      const matchedSubject = filters.subjects.find((subject) => {
        const board = filters.boards.find(
          (entry) => entry.id === subject.boardId
        );
        if (!board || !subject.classSlug) return false;
        if (subject.slug !== featuredSubject.subjectSlug) return false;
        if (session.user.board && board.slug !== session.user.board)
          return false;
        if (session.user.class && subject.classSlug !== session.user.class)
          return false;
        return true;
      });
      if (matchedSubject) {
        const matchedBoard = filters.boards.find(
          (board) => board.id === matchedSubject.boardId
        );
        if (matchedBoard && matchedSubject.classSlug) {
          routeSeed = {
            boardSlug: matchedBoard.slug,
            classSlug: matchedSubject.classSlug,
            subjectSlug: matchedSubject.slug,
          };
        }
      }
    }
    if (!routeSeed) {
      const fallbackSubject = filters.subjects.find((subject) => {
        const board = filters.boards.find(
          (entry) => entry.id === subject.boardId
        );
        if (!board || !subject.classSlug) return false;
        if (session.user.board && board.slug !== session.user.board)
          return false;
        if (session.user.class && subject.classSlug !== session.user.class)
          return false;
        return true;
      });
      if (!fallbackSubject)
        throw new Error(
          "No subject route available for the current profile scope."
        );
      const fallbackBoard = filters.boards.find(
        (board) => board.id === fallbackSubject.boardId
      );
      if (fallbackBoard && fallbackSubject.classSlug) {
        routeSeed = {
          boardSlug: fallbackBoard.slug,
          classSlug: fallbackSubject.classSlug,
          subjectSlug: fallbackSubject.slug,
        };
      }
    }
  } catch {
    routeSeed = null;
  }

  let firstChapterBasePath: string | null = null;
  if (routeSeed) {
    try {
      const overview = await getSubjectOverview({
        board: routeSeed.boardSlug,
        grade: routeSeed.classSlug,
        subject: routeSeed.subjectSlug,
      });
      const publishedChapters =
        overview?.chapters.filter((chapter) => chapter.isPublished) ?? [];
      const orderedChapters = [
        ...(publishedChapters.length > 0
          ? publishedChapters
          : (overview?.chapters ?? [])),
      ].sort((a, b) => a.chapterNumber - b.chapterNumber);
      const firstChapter = orderedChapters[0];
      if (firstChapter) {
        firstChapterBasePath = `/${routeSeed.boardSlug}/${routeSeed.classSlug}/${routeSeed.subjectSlug}/${firstChapter.slug}`;
      }
    } catch {
      firstChapterBasePath = null;
    }
  }

  const continueHref = firstChapterBasePath
    ? `${firstChapterBasePath}?tab=summary`
    : null;

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  return (
    <AppShell
      session={session}
      currentPath="/dashboard"
      contentClassName="max-w-7xl mx-auto px-4 pb-10 pt-4 sm:px-6 lg:px-8"
    >
      <div className="mb-6">
        <PageHeader
          title={`Welcome back, ${displayName}`}
          subtitle="Track your progress, continue learning, and reach your goals."
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "Dashboard" },
          ]}
        />
      </div>

      <DashboardClient
        displayName={displayName}
        summary={summary}
        summaryError={summaryError}
        featuredSubject={featuredSubject}
        continueHref={continueHref}
        orderedSubjects={orderedSubjects}
        firstChapterBasePath={firstChapterBasePath}
      />
    </AppShell>
  );
}

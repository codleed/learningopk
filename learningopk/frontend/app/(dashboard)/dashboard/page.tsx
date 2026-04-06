import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  DashboardClient,
} from "@/components/dashboard/DashboardClient";
import { AppShell } from "@/components/foundation/app-shell";
import { PageHeader } from "@/components/common/page-header";
import type { FocusAreaItem } from "@/components/dashboard/focus-areas-widget";
import { getSubjectsList, getSubjectOverview } from "@/lib/learn-api";
import { getLearningPath } from "@/lib/learning-path-api";
import {
  getDashboardSummary,
  type DashboardSummaryResponse,
} from "@/lib/progress-api";
import { getServerSession } from "@/lib/session";
import { getStudyGroups } from "@/lib/study-groups-api";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type LearnRouteSeed = {
  boardSlug: string;
  classSlug: string;
  subjectSlug: string;
};

type ResolvedFocusAreaRoute = LearnRouteSeed & {
  chapterId: number;
  chapterSlug: string;
  chapterTitle: string;
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
  const learningPathResult = await getLearningPath(cookieStore.toString())
    .then((data) => ({ learningPath: data, learningPathError: null as string | null }))
    .catch((error: unknown) => ({
      learningPath: { recommendedChapters: [] },
      learningPathError:
        error instanceof Error ? error.message : "Unable to load learning path.",
    }));
  const studyGroupsResult = await getStudyGroups(cookieStore.toString())
    .then((data) => ({ groups: data.groups }))
    .catch(() => ({ groups: [] }));

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
    const subjectsList = await getSubjectsList();
    const allSubjects = subjectsList?.subjects ?? [];
    if (featuredSubject) {
      const matchedSubject = allSubjects.find((subject) => {
        if (!subject.classSlug) return false;
        if (subject.slug !== featuredSubject.subjectSlug) return false;
        if (session.user.board && subject.boardSlug !== session.user.board)
          return false;
        if (session.user.class && subject.classSlug !== session.user.class)
          return false;
        return true;
      });
      if (matchedSubject && matchedSubject.classSlug) {
        routeSeed = {
          boardSlug: matchedSubject.boardSlug,
          classSlug: matchedSubject.classSlug,
          subjectSlug: matchedSubject.slug,
        };
      }
    }
    if (!routeSeed) {
      const fallbackSubject = allSubjects.find((subject) => {
        if (!subject.classSlug) return false;
        if (session.user.board && subject.boardSlug !== session.user.board)
          return false;
        if (session.user.class && subject.classSlug !== session.user.class)
          return false;
        return true;
      });
      if (!fallbackSubject)
        throw new Error(
          "No subject route available for the current profile scope."
        );
      if (fallbackSubject.classSlug) {
        routeSeed = {
          boardSlug: fallbackSubject.boardSlug,
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

  let focusAreas: FocusAreaItem[] = [];
  const requestedFocusAreas = learningPathResult.learningPath.recommendedChapters.slice(0, 3);

  if (requestedFocusAreas.length > 0) {
    try {
      const subjectsList = await getSubjectsList();
      const scopedSubjects = (subjectsList?.subjects ?? []).filter((subject) => {
        if (!subject.classSlug) return false;
        if (session.user.board && subject.boardSlug !== session.user.board) return false;
        if (session.user.class && subject.classSlug !== session.user.class) return false;
        return true;
      });

      const resolvedRoutes: ResolvedFocusAreaRoute[] = [];

      for (const subject of scopedSubjects) {
        const overview = await getSubjectOverview({
          board: subject.boardSlug,
          grade: subject.classSlug ?? "",
          subject: subject.slug,
        });

        for (const chapter of overview?.chapters ?? []) {
          if (!requestedFocusAreas.some((item) => item.chapterId === chapter.id)) {
            continue;
          }

          resolvedRoutes.push({
            chapterId: chapter.id,
            chapterSlug: chapter.slug,
            chapterTitle: chapter.title,
            boardSlug: subject.boardSlug,
            classSlug: subject.classSlug ?? "",
            subjectSlug: subject.slug,
          });
        }

        if (resolvedRoutes.length >= requestedFocusAreas.length) {
          break;
        }
      }

      focusAreas = requestedFocusAreas
        .map((item) => {
          const route = resolvedRoutes.find((entry) => entry.chapterId === item.chapterId);
          if (!route) return null;

          return {
            ...item,
            title: route.chapterTitle,
            href: `/${route.boardSlug}/${route.classSlug}/${route.subjectSlug}/${route.chapterSlug}?tab=exercises`
          };
        })
        .filter((item): item is FocusAreaItem => item !== null);
    } catch {
      focusAreas = [];
    }
  }

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
        focusAreas={focusAreas}
        studyGroups={studyGroupsResult.groups}
      />
    </AppShell>
  );
}

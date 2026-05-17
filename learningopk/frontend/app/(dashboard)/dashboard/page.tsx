import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  DashboardClient,
} from "@/components/dashboard/DashboardClient";
import { AppShell } from "@/components/foundation/app-shell";
import { PageHeader } from "@/components/common/page-header";
import type { FocusAreaItem } from "@/components/dashboard/focus-areas-widget";
import {
  getSubjectsList,
  getSubjectOverview,
  type SubjectsListResponse,
  type SubjectResponse,
} from "@/lib/learn-api";
import { getLearningPath, type LearningPathResponse } from "@/lib/learning-path-api";
import {
  getDashboardSummary,
  type DashboardSummaryResponse,
} from "@/lib/progress-api";
import { getServerSession } from "@/lib/session";
import { getStudyGroups, type StudyGroupsListResponse } from "@/lib/study-groups-api";
import { getMySchool } from "@/lib/school-api";
import { JoinSchoolCard } from "@/components/school/join-school-card";
import { Badge } from "@/components/ui/badge";

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

  /* ---------------------------------------------------------------- */
  /*  PHASE 1: Fire ALL independent API calls in parallel             */
  /*  getDashboardSummary, getLearningPath, getStudyGroups, and       */
  /*  getSubjectsList are all independent — no reason to waterfall.   */
  /* ---------------------------------------------------------------- */
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const [summarySettled, learningPathSettled, studyGroupsSettled, subjectsListSettled, mySchoolSettled] =
    await Promise.allSettled([
      getDashboardSummary(cookieHeader),
      getLearningPath(cookieHeader),
      getStudyGroups(cookieHeader),
      getSubjectsList(),
      getMySchool(cookieHeader),
    ]);

  /* ---- Unwrap settled results with proper fallbacks ---- */
  const summary: DashboardSummaryResponse | null =
    summarySettled.status === "fulfilled" ? summarySettled.value : null;
  const summaryError: string | null =
    summarySettled.status === "rejected"
      ? summarySettled.reason instanceof Error
        ? summarySettled.reason.message
        : "Unable to load progress dashboard."
      : null;

  const learningPath: LearningPathResponse =
    learningPathSettled.status === "fulfilled"
      ? learningPathSettled.value
      : { recommendedChapters: [] };

  const studyGroups: StudyGroupsListResponse["groups"] =
    studyGroupsSettled.status === "fulfilled"
      ? studyGroupsSettled.value.groups
      : [];

  // Single subjects list used everywhere (deduplicated — was called twice before)
  const subjectsList: SubjectsListResponse | null =
    subjectsListSettled.status === "fulfilled" ? subjectsListSettled.value : null;
  const allSubjects = subjectsList?.subjects ?? [];

  const mySchool = mySchoolSettled.status === "fulfilled" ? mySchoolSettled.value : null;

  /* ---- Derive summary-dependent values ---- */
  const subjects = summary?.subjects ?? [];
  const scopedSummarySubjects = subjects.filter((subject) => {
    if (!session.user.board) return false;
    if (subject.boardSlug !== session.user.board) return false;
    return true;
  });
  const orderedSubjects = [...scopedSummarySubjects].sort(
    (a, b) =>
      b.chaptersVisitedPercent - a.chaptersVisitedPercent ||
      b.bestQuizScorePercent - a.bestQuizScorePercent
  );
  const featuredSubject = orderedSubjects[0] ?? null;

  const displayName =
    summary && summary.studentName.trim().length > 0
      ? summary.studentName
      : session.user.name;

  /* ---- Scope subjects to the user's board/class ---- */
  const scopedSubjects = allSubjects.filter((subject) => {
    if (!subject.classSlug) return false;
    if (session.user.board && subject.boardSlug !== session.user.board)
      return false;
    if (session.user.class && subject.classSlug !== session.user.class)
      return false;
    return true;
  });

  /* ---- Route seed (resolve "Continue Learning" link) ---- */
  let routeSeed: LearnRouteSeed | null = null;
  try {
    if (featuredSubject) {
      const matchedSubject = scopedSubjects.find(
        (subject) => subject.slug === featuredSubject.subjectSlug
      );
      if (matchedSubject && matchedSubject.classSlug) {
        routeSeed = {
          boardSlug: matchedSubject.boardSlug,
          classSlug: matchedSubject.classSlug,
          subjectSlug: matchedSubject.slug,
        };
      }
    }
    if (!routeSeed) {
      const fallbackSubject = scopedSubjects[0];
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

  /* ---------------------------------------------------------------- */
  /*  PHASE 2: Fire route-seed overview + all focus-area overviews    */
  /*  in parallel. This eliminates the N+1 sequential loop.           */
  /* ---------------------------------------------------------------- */
  const requestedFocusAreas = learningPath.recommendedChapters.slice(0, 3);
  const focusChapterIds = new Set(requestedFocusAreas.map((item) => item.chapterId));

  // Build the set of subject overviews we need to fetch:
  // 1. routeSeed overview (for "Continue Learning" link)
  // 2. All scoped subject overviews (for resolving focus area chapter IDs)
  //    — but skip fetching ones we don't need if no focus areas are requested
  type OverviewEntry = {
    key: string;
    board: string;
    grade: string;
    subject: string;
  };

  const overviewsToFetch: OverviewEntry[] = [];
  const overviewKeySet = new Set<string>();

  // Always fetch routeSeed overview if available
  if (routeSeed) {
    const key = `${routeSeed.boardSlug}/${routeSeed.classSlug}/${routeSeed.subjectSlug}`;
    overviewKeySet.add(key);
    overviewsToFetch.push({
      key,
      board: routeSeed.boardSlug,
      grade: routeSeed.classSlug,
      subject: routeSeed.subjectSlug,
    });
  }

  // Add scoped subject overviews needed for focus area resolution
  if (requestedFocusAreas.length > 0) {
    for (const subject of scopedSubjects) {
      const key = `${subject.boardSlug}/${subject.classSlug}/${subject.slug}`;
      if (!overviewKeySet.has(key)) {
        overviewKeySet.add(key);
        overviewsToFetch.push({
          key,
          board: subject.boardSlug,
          grade: subject.classSlug ?? "",
          subject: subject.slug,
        });
      }
    }
  }

  // Fire all overview fetches in parallel — eliminates the N+1 loop
  const overviewSettledResults = await Promise.allSettled(
    overviewsToFetch.map((entry) =>
      getSubjectOverview({
        board: entry.board,
        grade: entry.grade,
        subject: entry.subject,
      })
    )
  );

  // Build a lookup map: key → SubjectResponse
  const overviewMap = new Map<string, SubjectResponse | null>();
  overviewsToFetch.forEach((entry, index) => {
    const settled = overviewSettledResults[index];
    overviewMap.set(
      entry.key,
      settled?.status === "fulfilled" ? settled.value : null
    );
  });

  /* ---- Resolve "Continue Learning" link from overview ---- */
  let firstChapterBasePath: string | null = null;
  if (routeSeed) {
    try {
      const overview = overviewMap.get(
        `${routeSeed.boardSlug}/${routeSeed.classSlug}/${routeSeed.subjectSlug}`
      );
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

  /* ---- Resolve focus areas from the already-fetched overviews ---- */
  let focusAreas: FocusAreaItem[] = [];
  if (requestedFocusAreas.length > 0) {
    try {
      const resolvedRoutes: ResolvedFocusAreaRoute[] = [];

      for (const subject of scopedSubjects) {
        const key = `${subject.boardSlug}/${subject.classSlug}/${subject.slug}`;
        const overview = overviewMap.get(key);

        for (const chapter of overview?.chapters ?? []) {
          if (!focusChapterIds.has(chapter.id)) {
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
      contentClassName="max-w-6xl mx-auto px-5 pb-10 pt-4 sm:px-8 lg:px-10"
    >
      <div className="mb-6">
        <PageHeader
          sticky
          stickyClassName="-mx-5 -mt-4 sm:-mx-8 lg:-mx-10 px-5 sm:px-8 lg:px-10"
          title={`Welcome back, ${displayName}`}
          subtitle="Track your progress, continue learning, and reach your goals."
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "Dashboard" },
          ]}
        />
      </div>

      {mySchool ? (
        <Badge variant="primary" className="mb-4">
          🏫 {mySchool.name}
        </Badge>
      ) : (
        <JoinSchoolCard />
      )}

      <DashboardClient
        displayName={displayName}
        summary={summary}
        summaryError={summaryError}
        featuredSubject={featuredSubject}
        continueHref={continueHref}
        orderedSubjects={orderedSubjects}
        firstChapterBasePath={firstChapterBasePath}
        focusAreas={focusAreas}
        studyGroups={studyGroups}
      />
    </AppShell>
  );
}

import type { Icon } from "@phosphor-icons/react";
import {
  BookOpen,
  CheckCircle,
  MagnifyingGlass,
  Play,
  Pulse,
  Sparkle,
  Student,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { DashboardNotificationsControl } from "@/components/dashboard/dashboard-notifications-control";
import { AppShell } from "@/components/foundation/app-shell";
import {
  DashboardCard,
  DashboardSection,
  DashboardSurface,
} from "@/components/foundation/dashboard-primitives";
import { ErrorState } from "@/components/ui/states";
import { getForumFilters } from "@/lib/forum-api";
import { getSubjectOverview } from "@/lib/learn-api";
import {
  getDashboardSummary,
  type DashboardSummaryResponse,
} from "@/lib/progress-api";
import { getServerSession } from "@/lib/session";
import { cn } from "@/lib/utils";

type LearnRouteSeed = {
  boardSlug: string;
  classSlug: string;
  subjectSlug: string;
};

type LearningScreen = {
  label: string;
  description: string;
  href: string;
  icon: Icon;
};

type DashboardFilter = "all" | "in-progress" | "completed" | "high-score";
type DashboardRail = "dashboard" | "stats" | "calendar";

type DashboardPageSearchParams = {
  q?: string | string[];
  filter?: string | string[];
  rail?: string | string[];
};

type DashboardPageProps = {
  searchParams: Promise<DashboardPageSearchParams>;
};

const filterLabelMap: Record<DashboardFilter, string> = {
  all: "All courses",
  "in-progress": "In progress courses",
  completed: "Completed courses",
  "high-score": "High score (70%+)",
};

const railDescriptionMap: Record<
  Exclude<DashboardRail, "dashboard">,
  string
> = {
  stats: "Stats rail selected. Metrics cards below are the primary focus.",
  calendar:
    "Calendar rail selected. Weekly activity and recent timeline are highlighted.",
};

const courseIcons: Icon[] = [
  BookOpen,
  Pulse,
  CheckCircle,
  Student,
];

const getInitials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

const formatActivityTimestamp = (isoDate: string): string =>
  new Date(isoDate).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const toActivityLabel = (
  entry: DashboardSummaryResponse["recentActivity"][number],
): string => {
  if (entry.type === "chapter_visit") {
    return `Visited ${entry.subjectName}: ${entry.chapterTitle}`;
  }

  return `Quiz submitted in ${entry.subjectName}: ${entry.chapterTitle} (${entry.percentage}%)`;
};

const getFirstQueryValue = (
  value: string | string[] | undefined,
): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
};

const parseFilter = (value: string | undefined): DashboardFilter => {
  if (
    value === "in-progress" ||
    value === "completed" ||
    value === "high-score"
  ) {
    return value;
  }

  return "all";
};

const parseRail = (value: string | undefined): DashboardRail => {
  if (value === "stats" || value === "calendar") {
    return value;
  }

  return "dashboard";
};

const buildDashboardHref = (options: {
  q?: string;
  filter?: DashboardFilter;
  rail?: DashboardRail;
}): string => {
  const params = new URLSearchParams();

  if (options.q && options.q.trim().length > 0) {
    params.set("q", options.q.trim());
  }

  if (options.filter && options.filter !== "all") {
    params.set("filter", options.filter);
  }

  if (options.rail && options.rail !== "dashboard") {
    params.set("rail", options.rail);
  }

  const query = params.toString();
  return query.length > 0 ? `/dashboard?${query}` : "/dashboard";
};

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  const parsedSearchParams = await searchParams;
  const searchQuery = (getFirstQueryValue(parsedSearchParams.q) ?? "").trim();
  const selectedFilter = parseFilter(
    getFirstQueryValue(parsedSearchParams.filter),
  );
  const requestedRail = getFirstQueryValue(parsedSearchParams.rail);
  if (requestedRail === "settings") {
    redirect("/settings");
  }
  const activeRail = parseRail(requestedRail);

  const cookieStore = await cookies();
  const summaryResult = await getDashboardSummary(cookieStore.toString())
    .then((data) => ({
      summary: data,
      summaryError: null as string | null,
    }))
    .catch((error: unknown) => ({
      summary: null,
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
      b.bestQuizScorePercent - a.bestQuizScorePercent,
  );
  const normalizedSearchQuery = searchQuery.toLowerCase();
  const matchingSubjects = orderedSubjects.filter((subject) => {
    const matchesSearch =
      normalizedSearchQuery.length === 0 ||
      `${subject.subjectName} ${subject.boardName} ${subject.grade}`
        .toLowerCase()
        .includes(normalizedSearchQuery);

    if (!matchesSearch) {
      return false;
    }

    if (selectedFilter === "completed") {
      return (
        subject.chaptersVisitedPercent >= 90 ||
        subject.bestQuizScorePercent >= 90
      );
    }

    if (selectedFilter === "in-progress") {
      return (
        (subject.chaptersVisitedPercent > 0 ||
          subject.bestQuizScorePercent > 0) &&
        subject.chaptersVisitedPercent < 90 &&
        subject.bestQuizScorePercent < 90
      );
    }

    if (selectedFilter === "high-score") {
      return subject.bestQuizScorePercent >= 70;
    }

    return true;
  });
  const visibleSubjects = matchingSubjects.slice(0, 4);
  const hasCourseFilter =
    normalizedSearchQuery.length > 0 || selectedFilter !== "all";
  const featuredSubject = orderedSubjects[0] ?? null;
  const displayName =
    summary && summary.studentName.trim().length > 0
      ? summary.studentName
      : session.user.name;
  const avatarInitials = getInitials(displayName);
  const weeklyEvents =
    summary?.weeklyActivity.reduce(
      (total, item) => total + item.activityCount,
      0,
    ) ?? 0;
  const trackedHours = weeklyEvents * 2;
  const completedCourses = subjects.filter(
    (subject) =>
      subject.chaptersVisitedPercent >= 90 ||
      subject.bestQuizScorePercent >= 90,
  ).length;
  const completedTests =
    summary?.recentActivity.filter((item) => item.type === "quiz_submit")
      .length ?? 0;
  const averagePerformance =
    subjects.length > 0
      ? Math.round(
          subjects.reduce(
            (total, subject) => total + subject.bestQuizScorePercent,
            0,
          ) / subjects.length,
        )
      : 0;
  const notificationItems = (summary?.recentActivity ?? [])
    .slice(0, 5)
    .map((entry) => toActivityLabel(entry));

  let routeSeed: LearnRouteSeed | null = null;

  try {
    const filters = await getForumFilters();

    if (featuredSubject) {
      const matchedSubject = filters.subjects.find((subject) => {
        const board = filters.boards.find((entry) => entry.id === subject.boardId);
        if (!board || !subject.classSlug) {
          return false;
        }

        if (subject.slug !== featuredSubject.subjectSlug) {
          return false;
        }

        if (session.user.board && board.slug !== session.user.board) {
          return false;
        }

        if (session.user.class && subject.classSlug !== session.user.class) {
          return false;
        }

        return true;
      });
      if (matchedSubject) {
        const matchedBoard = filters.boards.find(
          (board) => board.id === matchedSubject.boardId,
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
        const board = filters.boards.find((entry) => entry.id === subject.boardId);
        if (!board || !subject.classSlug) {
          return false;
        }
        if (session.user.board && board.slug !== session.user.board) {
          return false;
        }
        if (session.user.class && subject.classSlug !== session.user.class) {
          return false;
        }
        return true;
      });
      if (!fallbackSubject) {
        throw new Error("No subject route available for the current profile scope.");
      }
      const fallbackBoard = filters.boards.find(
        (board) => board.id === fallbackSubject.boardId,
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

  const learningScreens: LearningScreen[] = firstChapterBasePath
    ? [
        {
          label: "Summary",
          description: "Read chapter overview and formulas.",
          href: `${firstChapterBasePath}?tab=summary`,
          icon: BookOpen,
        },
        {
          label: "Exercises",
          description: "Practice solved and unsolved questions.",
          href: `${firstChapterBasePath}?tab=exercises`,
          icon: Pulse,
        },
        {
          label: "Quiz",
          description: "Attempt chapter quiz or mock exam.",
          href: `${firstChapterBasePath}?tab=quiz`,
          icon: CheckCircle,
        },
        {
          label: "AI Tutor",
          description: "Open exercises with AI panel expanded.",
          href: `${firstChapterBasePath}?tab=exercises&ai=1`,
          icon: Sparkle,
        },
      ]
    : [];

  return (
    <AppShell
      session={session}
      currentPath="/dashboard"
      contentClassName="max-w-[96rem] px-3 pb-10 pt-3 sm:px-5 lg:px-6"
    >
      <DashboardSurface as="section" tone="shell" className="p-3 sm:p-4 lg:p-5">
        <div className="relative space-y-5">
            <DashboardSurface
              as="header"
              tone="header"
              className="px-4 py-4 sm:px-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-[12rem]">
                  <h1 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Dashboard
                  </h1>
                  <p className="mt-1 text-3xl font-semibold tracking-[-0.02em] text-foreground sm:text-[2.1rem]">
                    My Classes
                  </p>
                </div>

                <form
                  method="GET"
                  className="flex w-full flex-wrap items-center justify-end gap-2.5 sm:w-auto sm:gap-3"
                >
                  {selectedFilter !== "all" ? (
                    <input type="hidden" name="filter" value={selectedFilter} />
                  ) : null}
                  {activeRail !== "dashboard" ? (
                    <input type="hidden" name="rail" value={activeRail} />
                  ) : null}
                  <label className="flex min-w-[14rem] flex-1 items-center gap-2 rounded-2xl border border-border bg-secondary/70 px-4 py-2.5 text-sm text-muted-foreground sm:min-w-[18rem] sm:flex-none">
                    <MagnifyingGlass className="h-4 w-4 text-muted-foreground" weight="duotone" aria-hidden />
                    <span className="sr-only">Search classes</span>
                    <input
                      id="dashboard-search"
                      name="q"
                      type="search"
                      aria-label="Search classes"
                      defaultValue={searchQuery}
                      placeholder="Search..."
                      className="h-6 w-full border-0 bg-transparent p-0 text-sm font-medium text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
                    />
                  </label>
                  <DashboardSurface
                    as="button"
                    tone="toolbarButton"
                    type="submit"
                    aria-label="Apply search"
                  >
                    Apply search
                  </DashboardSurface>
                  {searchQuery.length > 0 ? (
                    <Link
                      href={buildDashboardHref({
                        filter: selectedFilter,
                        rail: activeRail,
                      })}
                      className="text-xs font-semibold uppercase tracking-[0.08em] text-primary underline underline-offset-4"
                    >
                      Clear
                    </Link>
                  ) : null}
                  <DashboardNotificationsControl items={notificationItems} />
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-muted text-sm font-semibold text-primary">
                    {avatarInitials}
                  </span>
                </form>
              </div>
            </DashboardSurface>

            <DashboardSurface
              as="article"
              tone="hero"
              className="px-6 py-7 sm:px-8 sm:py-8"
            >
              <div className="relative max-w-2xl">
                <p className="inline-flex items-center rounded-xl border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-primary">
                  {featuredSubject?.subjectName ?? "Physics"}
                </p>
                <p className="mt-6 text-4xl font-semibold leading-tight tracking-[-0.02em] text-foreground sm:text-6xl">
                  The study of the structure of matter.
                </p>
                <Link
                  href={
                    learningScreens[0]?.href ??
                    (featuredSubject
                      ? `/dashboard/${featuredSubject.subjectSlug}`
                      : "/dashboard")
                  }
                  className="mt-8 inline-flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.1em] text-primary"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Play className="h-4 w-4" weight="fill" aria-hidden />
                  </span>
                  Continue course
                </Link>
              </div>
            </DashboardSurface>

            {activeRail !== "dashboard" ? (
              <DashboardCard as="p" className="px-4 py-3 text-sm text-muted-foreground">
                {railDescriptionMap[activeRail]}
              </DashboardCard>
            ) : null}

            <DashboardSection
              title="Learning Screens"
              subtitle="Summary, exercises, quiz, and AI tutor"
              contentClassName="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4"
            >
              {learningScreens.length > 0 ? (
                learningScreens.map((screen) => (
                  <Link
                    key={screen.label}
                    href={screen.href}
                    className="group block"
                  >
                    <DashboardCard className="p-4 transition group-hover:border-primary/25 group-hover:shadow-[var(--elevation-card)]">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <screen.icon className="h-5 w-5" weight="duotone" aria-hidden />
                      </span>
                      <p className="mt-3 text-base font-semibold text-foreground group-hover:text-primary">
                        {screen.label}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {screen.description}
                      </p>
                    </DashboardCard>
                  </Link>
                ))
              ) : (
                <DashboardCard
                  as="p"
                  className="px-4 py-4 text-sm text-muted-foreground sm:col-span-2 2xl:col-span-4"
                >
                  No chapter route is available yet. Seed or publish at least
                  one chapter to show Summary, Exercises, Quiz, and AI links.
                </DashboardCard>
              )}
            </DashboardSection>

            <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
              <DashboardSection
                title="Course you're taking"
                actions={
                  <form
                    method="GET"
                    className="flex flex-wrap items-center gap-2"
                  >
                    {searchQuery.length > 0 ? (
                      <input type="hidden" name="q" value={searchQuery} />
                    ) : null}
                    {activeRail !== "dashboard" ? (
                      <input type="hidden" name="rail" value={activeRail} />
                    ) : null}
                    <label className="sr-only" htmlFor="dashboard-filter">
                      Filter courses
                    </label>
                    <select
                      id="dashboard-filter"
                      name="filter"
                      aria-label="Filter courses"
                      defaultValue={selectedFilter}
                      className="h-9 rounded-2xl border border-border bg-secondary/70 px-3 text-xs font-semibold uppercase tracking-[0.08em] text-foreground"
                    >
                      <option value="all">All</option>
                      <option value="in-progress">In progress</option>
                      <option value="completed">Completed</option>
                      <option value="high-score">High score</option>
                    </select>
                    <DashboardSurface
                      as="button"
                      tone="toolbarButton"
                      type="submit"
                      aria-label="Apply filter"
                    >
                      Apply filter
                    </DashboardSurface>
                  </form>
                }
                contentClassName="space-y-3"
              >
                {selectedFilter !== "all" ? (
                  <p className="text-xs font-semibold uppercase tracking-[0.07em] text-primary">
                    Filter: {filterLabelMap[selectedFilter]}
                  </p>
                ) : null}

                {orderedSubjects.length === 0 ? (
                  <DashboardCard
                    as="p"
                    className="px-4 py-5 text-sm text-muted-foreground"
                  >
                    No subject progress yet. Start a chapter to see your stats.
                  </DashboardCard>
                ) : visibleSubjects.length === 0 && hasCourseFilter ? (
                  <DashboardCard
                    as="p"
                    className="px-4 py-5 text-sm text-muted-foreground"
                  >
                    No courses match your current search/filter.
                  </DashboardCard>
                ) : (
                  visibleSubjects.map((subject, index) => {
                    const SubjectIcon = courseIcons[index % courseIcons.length];
                    const status =
                      subject.chaptersVisitedPercent >= 90
                        ? "Completed"
                        : "In progress";

                    return (
                      <Link
                        key={subject.subjectId}
                        href={`/dashboard/${subject.subjectSlug}`}
                        className="block"
                      >
                        <DashboardCard className="px-3 py-3 transition hover:border-primary/25 hover:shadow-[var(--elevation-card)]">
                          <article className="flex flex-wrap items-center gap-3 sm:flex-nowrap sm:gap-4">
                            <span className="inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                              <SubjectIcon className="h-5 w-5" weight="duotone" aria-hidden />
                            </span>
                            <div className="min-w-[12rem] flex-1">
                              <p className="text-xl font-medium text-foreground">
                                {subject.subjectName}
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {subject.chaptersVisitedPercent}% chapters
                                visited and {subject.bestQuizScorePercent}% best
                                quiz score
                              </p>
                              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                <span
                                  className="block h-full rounded-full bg-primary"
                                  style={{
                                    width: `${Math.max(subject.chaptersVisitedPercent, 6)}%`,
                                  }}
                                />
                              </div>
                            </div>
                            <span
                              className={cn(
                                "rounded-full px-3 py-1 text-xs font-semibold",
                                status === "Completed"
                                  ? "border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200"
                                  : "border border-border bg-muted text-muted-foreground",
                              )}
                            >
                              {status}
                            </span>
                          </article>
                        </DashboardCard>
                      </Link>
                    );
                  })
                )}
              </DashboardSection>

              <DashboardSection
                title="My Progress"
                subtitle="Last month"
                contentClassName="grid gap-3 sm:grid-cols-2"
              >
                <DashboardCard className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-medium text-foreground">
                      Track your study time
                    </h3>
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary/10 px-2 text-xs font-semibold text-primary">
                      1
                    </span>
                  </div>
                  <div className="mt-6 flex h-20 items-end gap-2">
                    {[38, 56, 44, 70, 48, 62].map((height, index) => (
                      <span
                        key={height + index}
                        className={cn(
                          "w-1.5 rounded-full bg-primary/25",
                          index === 3 ? "bg-primary" : "",
                        )}
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                  <p className="mt-5 text-xs uppercase tracking-[0.08em] text-muted-foreground">
                    Hours
                  </p>
                  <p className="text-5xl font-light leading-none text-foreground">
                    {trackedHours}
                  </p>
                </DashboardCard>

                <article className="rounded-[1.35rem] border border-primary/30 bg-primary/10 p-4 text-foreground shadow-[var(--elevation-soft)]">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-medium">Courses completed</h3>
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-muted/80 px-2 text-xs font-semibold text-primary">
                      2
                    </span>
                  </div>
                  <p className="mt-7 text-xs font-semibold uppercase tracking-[0.08em] text-primary">
                    70%
                  </p>
                  <p className="mt-2 text-6xl font-light leading-none">
                    {completedCourses.toString().padStart(2, "0")}
                  </p>
                </article>

                <article className="rounded-[1.35rem] border border-primary/30 bg-primary/10 p-4 text-foreground shadow-[var(--elevation-soft)]">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-medium">Complete tests</h3>
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-muted/80 px-2 text-xs font-semibold text-primary">
                      3
                    </span>
                  </div>
                  <p className="mt-7 text-4xl font-light leading-none">
                    {completedTests}
                  </p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.08em] text-primary">
                    Quiz submissions
                  </p>
                </article>

                <DashboardCard className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-medium text-foreground">
                      Performance
                    </h3>
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary/10 px-2 text-xs font-semibold text-primary">
                      4
                    </span>
                  </div>
                  <div className="mt-5 h-20 overflow-hidden rounded-xl bg-muted p-2">
                    <svg
                      viewBox="0 0 100 40"
                      role="presentation"
                      className="h-full w-full text-primary"
                    >
                      <path
                        d="M1 34 C 12 30, 18 12, 30 24 S 46 39, 56 22 S 75 5, 85 17 S 94 32, 99 20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {averagePerformance}% average best-quiz score
                  </p>
                </DashboardCard>
              </DashboardSection>
            </div>

            {summaryError ? (
              <ErrorState
                title="Progress data is temporarily unavailable"
                description={`${summaryError} Ensure backend is running on http://localhost:3001.`}
              />
            ) : null}

            {summary ? (
              <DashboardSection
                title="Recent Activity"
                subtitle={`${summary.recentActivity.length} events`}
                contentClassName="space-y-2"
              >
                {summary.recentActivity.length === 0 ? (
                  <DashboardCard
                    as="p"
                    className="px-4 py-3 text-sm text-muted-foreground"
                  >
                    No activity yet. Start a chapter to populate your timeline.
                  </DashboardCard>
                ) : (
                  summary.recentActivity.slice(0, 5).map((entry, index) => (
                    <DashboardCard
                      key={`${entry.type}-${entry.occurredAt}-${index}`}
                      className="rounded-[1rem] px-4 py-3"
                    >
                      <p className="text-sm font-medium text-foreground">
                        {toActivityLabel(entry)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatActivityTimestamp(entry.occurredAt)}
                      </p>
                    </DashboardCard>
                  ))
                )}
              </DashboardSection>
            ) : null}

            {featuredSubject ? (
              <Link
                href={`/dashboard/${featuredSubject.subjectSlug}`}
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary underline underline-offset-4 hover:text-primary/85"
              >
                Open first subject progress
              </Link>
            ) : null}
        </div>
      </DashboardSurface>
    </AppShell>
  );
}

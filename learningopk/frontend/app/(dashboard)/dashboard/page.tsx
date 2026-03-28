import type { Icon } from "@phosphor-icons/react";
import {
  Bell,
  BookOpen,
  CheckCircle,
  Gear,
  MagnifyingGlass,
  Play,
  Pulse,
  Sparkle,
  Star,
  Student,
  Users,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { DashboardNotificationsControl } from "@/components/dashboard/dashboard-notifications-control";
import { StatsCards } from "@/components/dashboard/StatsCards";
import {
  StaggerContainer,
  MotionSection,
  MotionCard,
} from "@/components/dashboard/DashboardClient";
import { AppShell } from "@/components/foundation/app-shell";
import { ErrorState } from "@/components/ui/states";
import { getForumFilters } from "@/lib/forum-api";
import { getSubjectOverview } from "@/lib/learn-api";
import {
  getDashboardSummary,
  type DashboardSummaryResponse,
} from "@/lib/progress-api";
import { getServerSession } from "@/lib/session";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Constants & helpers                                                */
/* ------------------------------------------------------------------ */

const filterLabelMap: Record<DashboardFilter, string> = {
  all: "All courses",
  "in-progress": "In progress courses",
  completed: "Completed courses",
  "high-score": "High score (70%+)",
};

const courseIcons: Icon[] = [BookOpen, Pulse, CheckCircle, Student];

const cardPalette = [
  { bg: "bg-[var(--primary)]/10", accent: "text-[var(--primary)]", border: "border-[var(--primary)]/20" },
  { bg: "bg-[var(--primary)]/15", accent: "text-[var(--primary)]", border: "border-[var(--primary)]/25" },
  { bg: "bg-[var(--success)]/10", accent: "text-[var(--success)]", border: "border-[var(--success)]/20" },
  { bg: "bg-[var(--info)]/10", accent: "text-[var(--info)]", border: "border-[var(--info)]/20" },
];

const categoryLabels = [
  "All",
  "IT & Software",
  "Media Training",
  "Business",
  "Interior",
];

const activityMonths = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
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
  if (Array.isArray(value)) return value[0];
  return value;
};

const parseFilter = (value: string | undefined): DashboardFilter => {
  if (
    value === "in-progress" ||
    value === "completed" ||
    value === "high-score"
  )
    return value;
  return "all";
};

const parseRail = (value: string | undefined): DashboardRail => {
  if (value === "stats" || value === "calendar") return value;
  return "dashboard";
};

const buildDashboardHref = (options: {
  q?: string;
  filter?: DashboardFilter;
  rail?: DashboardRail;
}): string => {
  const params = new URLSearchParams();
  if (options.q && options.q.trim().length > 0)
    params.set("q", options.q.trim());
  if (options.filter && options.filter !== "all")
    params.set("filter", options.filter);
  if (options.rail && options.rail !== "dashboard")
    params.set("rail", options.rail);
  const query = params.toString();
  return query.length > 0 ? `/dashboard?${query}` : "/dashboard";
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const parsedSearchParams = await searchParams;
  const searchQuery = (getFirstQueryValue(parsedSearchParams.q) ?? "").trim();
  const selectedFilter = parseFilter(
    getFirstQueryValue(parsedSearchParams.filter),
  );
  const requestedRail = getFirstQueryValue(parsedSearchParams.rail);
  if (requestedRail === "settings") redirect("/settings");
  const activeRail = parseRail(requestedRail);

  /* ---- data ---- */
  const cookieStore = await cookies();
  const summaryResult = await getDashboardSummary(cookieStore.toString())
    .then((data) => ({ summary: data, summaryError: null as string | null }))
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
    if (!matchesSearch) return false;
    if (selectedFilter === "completed")
      return (
        subject.chaptersVisitedPercent >= 90 ||
        subject.bestQuizScorePercent >= 90
      );
    if (selectedFilter === "in-progress")
      return (
        (subject.chaptersVisitedPercent > 0 ||
          subject.bestQuizScorePercent > 0) &&
        subject.chaptersVisitedPercent < 90 &&
        subject.bestQuizScorePercent < 90
      );
    if (selectedFilter === "high-score")
      return subject.bestQuizScorePercent >= 70;
    return true;
  });
  const visibleSubjects = matchingSubjects.slice(0, 4);
  const sidebarSubjects = orderedSubjects.slice(0, 3);
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
  const trackedHours = Math.round((weeklyEvents * 2) / 10) / 10 || 3.5;
  const completedCourses = subjects.filter(
    (subject) =>
      subject.chaptersVisitedPercent >= 90 ||
      subject.bestQuizScorePercent >= 90,
  ).length;
  const notificationItems = (summary?.recentActivity ?? [])
    .slice(0, 5)
    .map((entry) => toActivityLabel(entry));

  const friendsCount = 274;

  /* ---- route seed (unchanged server logic) ---- */
  let routeSeed: LearnRouteSeed | null = null;
  try {
    const filters = await getForumFilters();
    if (featuredSubject) {
      const matchedSubject = filters.subjects.find((subject) => {
        const board = filters.boards.find(
          (entry) => entry.id === subject.boardId,
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
        const board = filters.boards.find(
          (entry) => entry.id === subject.boardId,
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
          "No subject route available for the current profile scope.",
        );
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

  /* ---- activity bars for chart ---- */
  const activityBars = activityMonths.map((_, i) => {
    const weekData = summary?.weeklyActivity[i];
    return weekData ? Math.min(weekData.activityCount * 15, 100) : Math.floor(Math.random() * 60 + 20);
  });

  const barColors = [
    "bg-[var(--primary)]/60",
    "bg-[var(--primary)]/70",
    "bg-[var(--primary)]/80",
    "bg-[var(--primary)]/60",
    "bg-[var(--primary)]/70",
    "bg-[var(--primary)]/80",
    "bg-[var(--primary)]/60",
    "bg-[var(--primary)]/70",
    "bg-[var(--primary)]/80",
    "bg-[var(--primary)]/60",
    "bg-[var(--primary)]/70",
    "bg-[var(--primary)]/80",
  ];

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  return (
    <AppShell
      session={session}
      currentPath="/dashboard"
      contentClassName="max-w-[96rem] px-3 pb-10 pt-3 sm:px-5 lg:px-6"
    >
      <StaggerContainer className="grid gap-6 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_370px]">
          {/* ====================================================== */}
          {/*  LEFT / MAIN COLUMN                                     */}
          {/* ====================================================== */}
          <div className="min-w-0 space-y-6">
            {/* ---- Hero Title ---- */}
            <MotionSection>
              <h1 className="text-4xl font-semibold leading-[1.15] tracking-[-0.02em] text-foreground sm:text-5xl lg:text-[3.4rem]">
                Invest in your
                <br />
                education
              </h1>
            </MotionSection>

            {/* ---- XP, Level, Streak Stats ---- */}
            {summary && (
              <MotionSection>
                <StatsCards
                  streakDays={summary.streakDays}
                  longestStreakDays={summary.longestStreakDays}
                  xp={summary.xp}
                  streakFreeze={summary.streakFreeze}
                />
              </MotionSection>
            )}

            {/* ---- Category Chips ---- */}
            <MotionSection>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {categoryLabels.map((label, i) => (
                  <Link
                    key={label}
                    href={buildDashboardHref({
                      q: i === 0 ? undefined : label,
                      filter: selectedFilter,
                      rail: activeRail,
                    })}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-colors",
                      i === 0
                        ? "bg-foreground text-background"
                        : "bg-card text-foreground hover:bg-muted",
                    )}
                  >
                    {i === 0 && (
                      <span className="flex h-5 w-5 items-center justify-center">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 14 14"
                          fill="none"
                        >
                          <rect
                            x="0"
                            y="0"
                            width="6"
                            height="6"
                            rx="1.5"
                            fill="currentColor"
                          />
                          <rect
                            x="8"
                            y="0"
                            width="6"
                            height="6"
                            rx="1.5"
                            fill="currentColor"
                          />
                          <rect
                            x="0"
                            y="8"
                            width="6"
                            height="6"
                            rx="1.5"
                            fill="currentColor"
                          />
                          <rect
                            x="8"
                            y="8"
                            width="6"
                            height="6"
                            rx="1.5"
                            fill="currentColor"
                          />
                        </svg>
                      </span>
                    )}
                    {i === 1 && (
                      <BookOpen
                        className="h-4 w-4"
                        weight="fill"
                        aria-hidden
                      />
                    )}
                    {i === 2 && (
                      <Play className="h-4 w-4" weight="fill" aria-hidden />
                    )}
                    {i === 3 && (
                      <Student
                        className="h-4 w-4"
                        weight="fill"
                        aria-hidden
                      />
                    )}
                    {i === 4 && (
                      <Sparkle
                        className="h-4 w-4"
                        weight="fill"
                        aria-hidden
                      />
                    )}
                    {label}
                  </Link>
                ))}
              </div>
            </MotionSection>

            {/* ---- Most Popular Section ---- */}
            <MotionSection>
              <h2 className="mb-4 text-lg font-semibold text-foreground">
                Most popular
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                {visibleSubjects.length > 0
                  ? visibleSubjects.map((subject, index) => {
                      const palette =
                        cardPalette[index % cardPalette.length];
                      const SubjectIcon =
                        courseIcons[index % courseIcons.length];
                      const rating = (
                        4.5 +
                        (subject.bestQuizScorePercent % 6) / 10
                      ).toFixed(1);
                      const studentCount =
                        1000 +
                        subject.chaptersVisitedPercent * 80 +
                        index * 1200;
                      const categoryName = subject.subjectName;

                      return (
                        <MotionCard key={subject.subjectId}>
                          <Link
                            href={`/dashboard/${subject.subjectSlug}`}
                            className="block"
                          >
                            <article
                              className={cn(
                                "relative rounded-2xl p-5 transition-shadow hover:shadow-lg",
                                palette.bg,
                              )}
                            >
                              {/* Top row: icon + category + rating */}
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-background/60">
                                    <SubjectIcon
                                      className="h-4 w-4 text-foreground"
                                      weight="fill"
                                      aria-hidden
                                    />
                                  </span>
                                  <span className="text-xs font-semibold text-foreground/70">
                                    {categoryName}
                                  </span>
                                </div>
                                <span className="inline-flex items-center gap-1 rounded-full bg-background/60 px-2 py-1 text-xs font-bold text-foreground">
                                  <Star
                                    className="h-3 w-3 text-amber-500"
                                    weight="fill"
                                    aria-hidden
                                  />
                                  {rating}
                                </span>
                              </div>

                              {/* Title */}
                              <h3 className="mt-4 text-base font-semibold leading-snug text-foreground">
                                {subject.subjectName}:{" "}
                                {subject.boardName} Class{" "}
                                {subject.grade}
                              </h3>

                              {/* Bottom row: students + avatars */}
                              <div className="mt-4 flex items-center justify-between">
                                <span className="text-xs font-medium text-foreground/60">
                                  {studentCount.toLocaleString()} students
                                </span>
                                <div className="flex -space-x-2">
                                  {[0, 1].map((j) => (
                                    <span
                                      key={j}
                                      className="inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-foreground/10 text-[9px] font-bold text-foreground/60"
                                    >
                                      {getInitials(
                                        subject.subjectName,
                                      ).charAt(j) || "?"}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </article>
                          </Link>
                        </MotionCard>
                      );
                    })
                  : /* empty state cards */
                    [0, 1, 2, 3].map((i) => {
                      const palette = cardPalette[i];
                      return (
                        <MotionCard key={i}>
                          <article
                            className={cn(
                              "rounded-2xl p-5",
                              palette.bg,
                            )}
                          >
                            <p className="text-sm text-foreground/50">
                              No course data yet
                            </p>
                          </article>
                        </MotionCard>
                      );
                    })}
              </div>
            </MotionSection>

            {/* ---- Featured Course Banner ---- */}
            {featuredSubject && (
              <MotionSection>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-foreground/40">
                  Featured course
                </p>
                <Link
                  href={
                    learningScreens[0]?.href ??
                    `/dashboard/${featuredSubject.subjectSlug}`
                  }
                  className="group block"
                >
                  <div
                    className="relative overflow-hidden rounded-2xl p-6 transition-shadow group-hover:shadow-lg sm:p-8"
                    style={{ background: "linear-gradient(135deg, var(--primary)/20 0%, var(--primary)/10 50%, var(--success)/10 100%)" }}
                  >
                    <div className="max-w-md">
                      <span className="inline-flex items-center gap-1 rounded-full bg-background/50 px-2.5 py-1 text-xs font-bold text-foreground">
                        <Star
                          className="h-3 w-3 text-amber-500"
                          weight="fill"
                          aria-hidden
                        />
                        {(
                          4.5 +
                          (featuredSubject.bestQuizScorePercent % 6) / 10
                        ).toFixed(1)}
                      </span>
                      <h3 className="mt-3 text-xl font-semibold text-foreground sm:text-2xl">
                        {featuredSubject.subjectName}
                      </h3>
                      <p className="mt-1 text-sm text-foreground/60">
                        {featuredSubject.boardName} · Class{" "}
                        {featuredSubject.grade}
                      </p>
                      <div className="mt-4 flex items-center gap-3">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background">
                          <Play
                            className="h-4 w-4"
                            weight="fill"
                            aria-hidden
                          />
                        </span>
                        <span className="text-sm font-semibold text-foreground">
                          Continue course
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </MotionSection>
            )}

            {/* Search + filter (hidden form, preserves existing functionality) */}
            <form method="GET" className="hidden">
              {selectedFilter !== "all" && (
                <input type="hidden" name="filter" value={selectedFilter} />
              )}
              {activeRail !== "dashboard" && (
                <input type="hidden" name="rail" value={activeRail} />
              )}
              <input
                id="dashboard-search"
                name="q"
                type="search"
                defaultValue={searchQuery}
              />
            </form>

            {/* Error state */}
            {summaryError && (
              <MotionSection>
                <ErrorState
                  title="Progress data is temporarily unavailable"
                  description={`${summaryError} Ensure backend is running on http://localhost:3001.`}
                />
              </MotionSection>
            )}
          </div>

          {/* ====================================================== */}
          {/*  RIGHT SIDEBAR                                          */}
          {/* ====================================================== */}
          <div className="space-y-5">
            {/* ---- Profile Card ---- */}
            <MotionSection>
              <div className="rounded-2xl bg-card p-5">
                {/* Top icons */}
                <div className="flex items-center justify-between">
                  <DashboardNotificationsControl items={notificationItems} />
                  <Link href="/settings">
                    <Gear
                      className="h-5 w-5 text-foreground/40 transition-colors hover:text-foreground"
                      weight="fill"
                      aria-hidden
                    />
                  </Link>
                </div>

                {/* Avatar + name */}
                <div className="mt-3 flex flex-col items-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary)]/20 text-xl font-bold text-[var(--primary)]">
                    {avatarInitials}
                  </div>
                  <h2 className="mt-3 text-lg font-semibold text-foreground">
                    {displayName}
                  </h2>
                </div>

                {/* Friends row */}
                <div className="mt-4 flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Users
                      className="h-4 w-4 text-foreground/50"
                      weight="fill"
                      aria-hidden
                    />
                    <span className="text-sm font-bold text-foreground">
                      {friendsCount}
                    </span>
                    <span className="text-sm text-foreground/50">Friends</span>
                  </div>
                  <div className="flex -space-x-1.5">
                    {[0, 1, 2].map((j) => (
                      <span
                        key={j}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-foreground/10 text-[8px] font-bold text-foreground/50"
                      >
                        {avatarInitials.charAt(j % avatarInitials.length) ||
                          "?"}
                      </span>
                    ))}
                  </div>
                  <span className="text-xs text-foreground/30">›</span>
                </div>
              </div>
            </MotionSection>

            {/* ---- Activity Widget ---- */}
            <MotionSection>
              <div className="rounded-2xl bg-card p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">
                    Activity
                  </h3>
                  <span className="rounded-full bg-muted/50 px-3 py-1 text-xs font-medium text-foreground/60">
                    Year ▾
                  </span>
                </div>

                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-foreground">
                    {trackedHours}h
                  </span>
                  <span className="text-sm text-foreground/50">
                    👍 Great result!
                  </span>
                </div>

                {/* Bar chart */}
                <div className="mt-4 flex items-end gap-1.5" style={{ height: 80 }}>
                  {activityBars.map((h, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex-1 rounded-t-sm transition-all",
                        barColors[i % barColors.length],
                      )}
                      style={{ height: `${Math.max(h, 10)}%` }}
                    />
                  ))}
                </div>

                {/* Month labels */}
                <div className="mt-1.5 flex gap-1.5">
                  {activityMonths.map((m, i) => (
                    <span
                      key={m}
                      className={cn(
                        "flex-1 text-center text-[9px]",
                        i === 11
                          ? "font-bold text-foreground"
                          : "text-foreground/35",
                      )}
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </MotionSection>

            {/* ---- My Courses ---- */}
            <MotionSection>
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                My courses
              </h3>
              <div className="space-y-3">
                {sidebarSubjects.length > 0
                  ? sidebarSubjects.map((subject, index) => {
                      const palette =
                        cardPalette[index % cardPalette.length];
                      const SubjectIcon =
                        courseIcons[index % courseIcons.length];
                      const rating = (
                        4.5 +
                        (subject.bestQuizScorePercent % 6) / 10
                      ).toFixed(1);
                        const studentCount =
                          1000 +
                          subject.chaptersVisitedPercent * 80 +
                          index * 1200;

                        return (
                          <MotionCard key={subject.subjectId}>
                            <Link
                              href={`/dashboard/${subject.boardSlug}/${subject.grade}/${subject.subjectSlug}`}
                              className="block"
                            >
                              <article
                                className={cn(
                                  "rounded-2xl p-4 transition-shadow hover:shadow-md",
                                  palette.bg,
                                )}
                            >
                              <div className="flex items-start gap-3">
                                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background/50">
                                  <SubjectIcon
                                    className="h-4 w-4 text-foreground"
                                    weight="fill"
                                    aria-hidden
                                  />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[10px] font-semibold text-foreground/60">
                                      {subject.subjectName}
                                    </span>
                                    <span className="inline-flex items-center gap-0.5 text-xs font-bold text-foreground">
                                      <Star
                                        className="h-3 w-3 text-amber-500"
                                        weight="fill"
                                        aria-hidden
                                      />
                                      {rating}
                                    </span>
                                  </div>
                                  <h4 className="mt-1 text-sm font-semibold leading-snug text-foreground">
                                    {subject.subjectName}: {subject.boardName}
                                  </h4>
                                  <p className="mt-1 text-[11px] text-foreground/50">
                                    {studentCount.toLocaleString()} students
                                  </p>
                                </div>
                              </div>
                            </article>
                          </Link>
                        </MotionCard>
                      );
                    })
                  : [0, 1].map((i) => (
                      <MotionCard key={i}>
                        <article
                          className={cn(
                            "rounded-2xl p-4",
                            cardPalette[i].bg,
                          )}
                        >
                          <p className="text-sm text-foreground/50">
                            No course data yet
                          </p>
                        </article>
                      </MotionCard>
                    ))}
              </div>
            </MotionSection>

            {/* Recent Activity (compact) */}
            {summary && summary.recentActivity.length > 0 && (
              <MotionSection>
                <div className="rounded-2xl bg-card p-4">
                  <h3 className="text-sm font-semibold text-foreground">
                    Recent Activity
                  </h3>
                  <div className="mt-3 space-y-2">
                    {summary.recentActivity.slice(0, 3).map((entry, index) => (
                      <div
                        key={`${entry.type}-${entry.occurredAt}-${index}`}
                        className="rounded-xl bg-muted/50 px-3 py-2"
                      >
                        <p className="text-xs font-medium text-foreground/80">
                          {toActivityLabel(entry)}
                        </p>
                        <p className="mt-0.5 text-[10px] text-foreground/40">
                          {formatActivityTimestamp(entry.occurredAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </MotionSection>
            )}
          </div>
        </StaggerContainer>
    </AppShell>
  );
}

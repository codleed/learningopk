import Link from "next/link";

import { AppShell } from "@/components/foundation/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { ForumFilterBar } from "@/components/forum/forum-filter-bar";
import { ForumThreadFeed } from "@/components/forum/forum-thread-feed";
import { ForumThreadForm } from "@/components/forum/forum-thread-form";
import { ForumSidebar } from "@/components/forum/forum-sidebar";
import { ForumTrendingSidebar } from "@/components/forum/forum-trending-sidebar";
import { ErrorState } from "@/components/ui/states";
import { getForumFilters, getForumThreads } from "@/lib/forum-api";
import { buildForumHref, forumSearchParamsSchema } from "@/lib/forum-utils";
import { getServerSession } from "@/lib/session";

type ForumFeedPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const getFirstValue = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
};

export default async function ForumFeedPage({ searchParams }: ForumFeedPageProps) {
  const initialThreadLimit = 30;
  const rawSearchParams = await searchParams;
  const parsedSearchParams = forumSearchParamsSchema.safeParse({
    q: getFirstValue(rawSearchParams.q),
    board: getFirstValue(rawSearchParams.board),
    grade: getFirstValue(rawSearchParams.grade),
    subjectId: getFirstValue(rawSearchParams.subjectId),
    chapterId: getFirstValue(rawSearchParams.chapterId),
    solved: getFirstValue(rawSearchParams.solved),
    compose: getFirstValue(rawSearchParams.compose)
  });

  const query = parsedSearchParams.success ? parsedSearchParams.data : { solved: "all" as const };
  const searchQuery = query.q;
  const selectedSubjectId = query.subjectId ? Number(query.subjectId) : undefined;
  const selectedChapterId = query.chapterId ? Number(query.chapterId) : undefined;
  const selectedBoard = query.board;
  const selectedGrade = query.grade;
  const selectedSolved = query.solved;
  const session = await getServerSession();
  const isComposeMode = Boolean(session && query.compose === "1");
  const forumListHref = buildForumHref({
    q: searchQuery,
    board: selectedBoard,
    grade: selectedGrade,
    subjectId: selectedSubjectId,
    chapterId: selectedChapterId,
    solved: selectedSolved
  });
  const forumComposeHref = buildForumHref({
    q: searchQuery,
    board: selectedBoard,
    grade: selectedGrade,
    subjectId: selectedSubjectId,
    chapterId: selectedChapterId,
    solved: selectedSolved,
    compose: "1"
  });
  let forumFilters: Awaited<ReturnType<typeof getForumFilters>> = {
    boards: [],
    classes: [],
    subjects: [],
    chapters: []
  };
  let forumFeed: Awaited<ReturnType<typeof getForumThreads>> = {
    threads: []
  };
  let forumError: string | null = null;

  try {
    if (isComposeMode) {
      forumFilters = await getForumFilters();
    } else {
      [forumFilters, forumFeed] = await Promise.all([
        getForumFilters(),
        getForumThreads({
          q: searchQuery,
          board: selectedBoard,
          grade: selectedGrade,
          subjectId: selectedSubjectId,
          chapterId: selectedChapterId,
          solved: selectedSolved,
          limit: initialThreadLimit
        })
      ]);
    }
  } catch (error) {
    forumError = error instanceof Error ? error.message : "Unable to load forum feed.";
  }

  if (forumError) {
    return (
      <AppShell session={session} currentPath="/forum">
        <div className="space-y-6">
          <PageHeader
            sticky
            stickyClassName="-mx-4 -mt-6 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8"
            title="Community Forum"
            subtitle="Ask questions, share hints, and help other students learn faster."
            breadcrumbs={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Forum" },
            ]}
          />
          <ErrorState
            title="Forum is temporarily unavailable"
            description={`${forumError} Ensure backend is running on http://localhost:3001.`}
          />
        </div>
      </AppShell>
    );
  }

  const scopedForumFilters =
    session?.user.role === "student"
      ? (() => {
          const scopedBoards = forumFilters.boards.filter((board) => {
            if (!session.user.board) {
              return true;
            }
            return board.slug === session.user.board;
          });
          const scopedBoardIds = new Set(scopedBoards.map((board) => board.id));

          const scopedClasses = forumFilters.classes.filter((boardClass) => {
            if (!scopedBoardIds.has(boardClass.boardId)) {
              return false;
            }
            if (!session.user.class) {
              return true;
            }
            return boardClass.slug === session.user.class;
          });
          const scopedClassSlugs = new Set(scopedClasses.map((boardClass) => boardClass.slug));

          const scopedSubjects = forumFilters.subjects.filter((subject) => {
            if (!scopedBoardIds.has(subject.boardId)) {
              return false;
            }
            if (!session.user.class) {
              return true;
            }
            return subject.classSlug !== null && scopedClassSlugs.has(subject.classSlug);
          });
          const scopedSubjectIds = new Set(scopedSubjects.map((subject) => subject.id));

          return {
            boards: scopedBoards,
            classes: scopedClasses,
            subjects: scopedSubjects,
            chapters: forumFilters.chapters.filter((chapter) => scopedSubjectIds.has(chapter.subjectId))
          };
        })()
      : forumFilters;

  return (
    <AppShell session={session} currentPath="/forum">
      <div className="space-y-6">
        {/* ── Page Header ── */}
        <PageHeader
          sticky
          stickyClassName="-mx-4 -mt-6 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8"
          title="Community Forum"
          subtitle="Ask questions, share hints, and help other students learn faster."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Forum" },
          ]}
        />

        {/* ── Three-Column Layout ── */}
        <div className="flex gap-6">
          {/* ── Left Sidebar: Filters ── */}
          <aside className="hidden w-[200px] shrink-0 lg:block" aria-label="Forum filters">
            <ForumSidebar
              filters={scopedForumFilters}
              selected={{
                q: searchQuery,
                board: selectedBoard,
                grade: selectedGrade,
                subjectId: selectedSubjectId,
                chapterId: selectedChapterId,
                solved: selectedSolved
              }}
            />
          </aside>

          {/* ── Main Content ── */}
          <main className="min-w-0 flex-1">
            {/* ── Filter Bar + Create Button ── */}
            <ForumFilterBar
              filters={scopedForumFilters}
              createThreadHref={session ? forumComposeHref : undefined}
              session={session}
              topContent={
                session ? null : (
                  <p className="text-sm text-text-secondary">
                    <Link href="/login" className="font-semibold text-accent-primary underline underline-offset-4 transition-colors hover:text-accent-primary-hover">
                      Sign in
                    </Link>{" "}
                    to create a thread. You can still browse all discussions below.
                  </p>
                )
              }
              selected={{
                q: searchQuery,
                board: selectedBoard,
                grade: selectedGrade,
                subjectId: selectedSubjectId,
                chapterId: selectedChapterId,
                solved: selectedSolved
              }}
            />

            {/* ── Thread Feed ── */}
            <div className="mt-4">
              <ForumThreadFeed
                initialThreads={forumFeed.threads}
                initialBatchSize={initialThreadLimit}
                query={{
                  q: searchQuery,
                  board: selectedBoard,
                  grade: selectedGrade,
                  subjectId: selectedSubjectId,
                  chapterId: selectedChapterId,
                  solved: selectedSolved
                }}
              />
            </div>
          </main>

          {/* ── Right Sidebar: Trending + Top Contributors ── */}
          <aside className="hidden w-[200px] shrink-0 xl:block" aria-label="Trending and contributors">
            <ForumTrendingSidebar threads={forumFeed.threads} />
          </aside>
        </div>

        {/* ── Compose Sheet (rendered client-side) ── */}
        {session ? (
          <ForumThreadForm
            subjects={scopedForumFilters.subjects}
            chapters={scopedForumFilters.chapters}
            isOpen={isComposeMode}
            closeHref={forumListHref}
          />
        ) : null}
      </div>
    </AppShell>
  );
}


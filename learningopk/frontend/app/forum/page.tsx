import Link from "next/link";
import { z } from "zod";

import { DashboardChromeHeader, DashboardChromeLayout } from "@/components/dashboard/dashboard-chrome-layout";
import { DashboardSurface } from "@/components/foundation/dashboard-primitives";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { ForumFilterBar } from "@/components/forum/forum-filter-bar";
import { ForumThreadFeed } from "@/components/forum/forum-thread-feed";
import { ForumThreadForm } from "@/components/forum/forum-thread-form";
import { ErrorState } from "@/components/ui/states";
import { getForumFilters, getForumThreads } from "@/lib/forum-api";
import { getServerSession } from "@/lib/session";

const forumSearchParamsSchema = z.object({
  q: z.string().trim().min(1).max(160).optional(),
  board: z.string().trim().regex(/^[a-z0-9-]+$/).optional(),
  grade: z.string().trim().regex(/^[a-z0-9-]+$/).optional(),
  subjectId: z.string().regex(/^\d+$/).optional(),
  chapterId: z.string().regex(/^\d+$/).optional(),
  solved: z.enum(["all", "solved", "unsolved"]).optional().default("all"),
  compose: z.enum(["1"]).optional()
});

type ForumFeedPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const getFirstValue = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
};

const buildForumHref = (query: {
  q?: string;
  board?: string;
  grade?: string;
  subjectId?: number;
  chapterId?: number;
  solved?: "all" | "solved" | "unsolved";
  compose?: "1";
}) => {
  const params = new URLSearchParams();
  if (query.q) {
    params.set("q", query.q);
  }
  if (query.board) {
    params.set("board", query.board);
  }
  if (query.grade) {
    params.set("grade", query.grade);
  }
  if (query.subjectId) {
    params.set("subjectId", String(query.subjectId));
  }
  if (query.chapterId) {
    params.set("chapterId", String(query.chapterId));
  }
  if (query.solved && query.solved !== "all") {
    params.set("solved", query.solved);
  }
  if (query.compose) {
    params.set("compose", query.compose);
  }

  const queryString = params.toString();
  return queryString.length > 0 ? `/forum?${queryString}` : "/forum";
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
      <DashboardChromeLayout
        session={session}
        currentPath="/forum"
        header={
          <>
            <Breadcrumbs
              items={[
                { label: "Dashboard", href: "/dashboard" },
                { label: "Forum" },
              ]}
              className="mb-3"
            />
            <DashboardChromeHeader
              eyebrow="Community"
              title="Forum"
              subtitle="Ask questions, share hints, and help other students learn faster."
            />
          </>
        }
      >
        <DashboardSurface as="section" tone="panel" className="p-4 sm:p-5">
          <ErrorState
            title="Forum is temporarily unavailable"
            description={`${forumError} Ensure backend is running on http://localhost:3001.`}
          />
        </DashboardSurface>
      </DashboardChromeLayout>
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
    <DashboardChromeLayout
      session={session}
      currentPath="/forum"
      header={
        <>
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Forum" },
            ]}
            className="mb-3"
          />
          <DashboardChromeHeader
            eyebrow="Community"
            title="Forum"
            subtitle="Ask questions, share hints, and help other students learn faster."
          />
        </>
      }
    >
      {isComposeMode ? (
        <DashboardSurface as="section" tone="panel" className="p-4 sm:p-5">
          <section className="surface-card space-y-4 rounded-xl border border-border p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-foreground">Create new thread</h2>
              <Link href={forumListHref} className="text-sm font-semibold text-foreground underline underline-offset-4">
                Back to forum
              </Link>
            </div>
            <ForumThreadForm subjects={scopedForumFilters.subjects} chapters={scopedForumFilters.chapters} />
          </section>
        </DashboardSurface>
      ) : (
        <>
          <DashboardSurface as="section" tone="panel" className="p-4 sm:p-5">
            <ForumFilterBar
              filters={scopedForumFilters}
              createThreadHref={session ? forumComposeHref : undefined}
              topContent={
                session ? null : (
                  <p className="text-sm text-muted-foreground">
                    <Link href="/login" className="font-semibold text-foreground underline underline-offset-4">
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
          </DashboardSurface>

          <DashboardSurface as="section" tone="panel" className="p-4 sm:p-5">
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
          </DashboardSurface>
        </>
      )}
    </DashboardChromeLayout>
  );
}

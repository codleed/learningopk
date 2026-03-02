import { notFound } from "next/navigation";
import { z } from "zod";

import { AppShell } from "@/components/foundation/app-shell";
import { ChapterProgressTracker } from "@/components/learn/chapter-progress-tracker";
import { ChapterStudyWorkspace } from "@/components/learn/chapter-study-workspace";
import { getChapterDetail } from "@/lib/learn-api";
import { getServerSession } from "@/lib/session";

const routeParamsSchema = z.object({
  board: z.string().trim().regex(/^[a-z0-9-]+$/),
  grade: z.string().trim().regex(/^[a-z0-9-]+$/),
  subject: z.string().trim().regex(/^[a-z0-9-]+$/),
  chapter: z.string().trim().regex(/^[a-z0-9-]+$/)
});

const tabSchema = z.enum(["summary", "exercises", "flashcards", "quiz"]).catch("summary");

type ChapterPageProps = {
  params: Promise<{
    board: string;
    grade: string;
    subject: string;
    chapter: string;
  }>;
  searchParams: Promise<{ tab?: string; ai?: string }>;
};

export default async function ChapterPage({ params, searchParams }: ChapterPageProps) {
  const session = await getServerSession();
  const routeParams = routeParamsSchema.safeParse(await params);
  if (!routeParams.success) {
    notFound();
  }
  if (session?.user.role === "student") {
    if (session.user.board && session.user.board !== routeParams.data.board) {
      notFound();
    }
    if (session.user.class && session.user.class !== routeParams.data.grade) {
      notFound();
    }
  }

  const query = await searchParams;
  const activeTab = tabSchema.parse(query.tab);
  const autoOpenAi = query.ai === "1";

  const payload = await getChapterDetail(routeParams.data);
  if (!payload) {
    notFound();
  }

  const basePath = `/${payload.board.slug}/${payload.class.slug}/${payload.subject.slug}/${payload.chapter.slug}`;
  const tabs = [
    { key: "summary", label: "Summary", href: `${basePath}?tab=summary` },
    { key: "exercises", label: "Exercises", href: `${basePath}?tab=exercises` },
    { key: "flashcards", label: "Flashcards", href: `${basePath}?tab=flashcards` },
    {
      key: "quiz",
      label: payload.quiz?.type === "mock_exam" ? "Mock Exam" : "Quiz",
      href: `${basePath}?tab=quiz`,
      disabled: payload.quiz === null
    }
  ];

  return (
    <AppShell
      session={session}
      currentPath={basePath}
      contentClassName="max-w-[95rem] px-3 pb-10 pt-4 sm:px-5 lg:px-7"
    >
      <ChapterProgressTracker chapterId={payload.chapter.id} />
      <ChapterStudyWorkspace
        boardName={payload.board.name}
        className={payload.class.name}
        subjectName={payload.subject.name}
        boardSlug={payload.board.slug}
        classSlug={payload.class.slug}
        subjectSlug={payload.subject.slug}
        activeTab={activeTab}
        tabs={tabs}
        chapterId={payload.chapter.id}
        chapterNumber={payload.chapter.chapterNumber}
        chapterTitle={payload.chapter.title}
        chapterSummary={payload.chapter.summary}
        exercises={payload.exercises}
        flashcards={payload.flashcards}
        quiz={payload.quiz}
        flashcardStorageKey={`learningopk:flashcards:${payload.board.slug}:${payload.class.slug}:${payload.subject.slug}:${payload.chapter.slug}`}
        autoOpenAi={autoOpenAi}
      />
    </AppShell>
  );
}

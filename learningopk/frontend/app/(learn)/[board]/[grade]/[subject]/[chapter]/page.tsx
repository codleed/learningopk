import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { AppShell } from "@/components/foundation/app-shell";
import { DashboardSection, DashboardSurface } from "@/components/foundation/dashboard-primitives";
import { Tabs, type TabItem } from "@/components/foundation/tabs";
import { ChapterExercisesWithAi } from "@/components/learn/chapter-exercises-with-ai";
import { ChapterProgressTracker } from "@/components/learn/chapter-progress-tracker";
import { FlashcardDeck } from "@/components/learn/flashcard-deck";
import { MarkdownMathRenderer } from "@/components/learn/markdown-math-renderer";
import { QuizRunner } from "@/components/learn/quiz-runner";
import { EmptyState } from "@/components/ui/states";
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
  const tabs: TabItem[] = [
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
      <DashboardSurface as="section" tone="shell" className="space-y-4 p-4 sm:p-5">
        <DashboardSurface as="header" tone="hero" className="px-5 py-6 sm:px-7">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-primary">
            {payload.board.name} | Class {payload.class.name} | {payload.subject.name}
          </p>
          <h1 className="mt-2 text-3xl font-medium text-foreground sm:text-4xl">
            Chapter {payload.chapter.chapterNumber}: {payload.chapter.title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Switch tabs to study summary, solve exercises with AI guidance, revise flashcards, and attempt quiz.
          </p>
          <Link
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary underline underline-offset-4"
            href={`/${payload.board.slug}/${payload.class.slug}/${payload.subject.slug}`}
          >
            Back to subject
          </Link>
        </DashboardSurface>

        <DashboardSurface as="div" tone="header" className="px-4 py-3">
          <Tabs activeKey={activeTab} items={tabs} ariaLabel="Chapter study tabs" />
        </DashboardSurface>

        <DashboardSection title="Study Content">
          {activeTab === "summary" ? (
            <MarkdownMathRenderer content={payload.chapter.summary} />
          ) : null}

          {activeTab === "exercises" ? (
            <ChapterExercisesWithAi
              chapterId={payload.chapter.id}
              chapterTitle={payload.chapter.title}
              exercises={payload.exercises}
              initialAiOpen={autoOpenAi}
            />
          ) : null}

          {activeTab === "flashcards" ? (
            <FlashcardDeck
              chapterId={payload.chapter.id}
              flashcards={payload.flashcards}
              storageKey={`learningopk:flashcards:${payload.board.slug}:${payload.class.slug}:${payload.subject.slug}:${payload.chapter.slug}`}
            />
          ) : null}

          {activeTab === "quiz" ? (
            payload.quiz ? (
              <QuizRunner quiz={payload.quiz} />
            ) : (
              <EmptyState
                title="Quiz unavailable"
                description="This chapter does not have a quiz yet. Continue with summary, exercises, and flashcards."
              />
            )
          ) : null}
        </DashboardSection>
      </DashboardSurface>
    </AppShell>
  );
}

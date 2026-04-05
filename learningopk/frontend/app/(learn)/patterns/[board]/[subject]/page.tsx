import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/foundation/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { TopicTrendChart } from "@/components/learn/topic-trend-chart";
import { Badge } from "@/components/ui";
import { getPatternAnalysis, getSubjectsList } from "@/lib/learn-api";
import { getServerSession } from "@/lib/session";

type PatternPageProps = {
  params: Promise<{
    board: string;
    subject: string;
  }>;
  searchParams: Promise<{ grade?: string }>;
};

export default async function PatternPage({ params, searchParams }: PatternPageProps) {
  const session = await getServerSession();
  const route = await params;
  const query = await searchParams;

  const subjectsList = await getSubjectsList().catch(() => null);
  const subjectEntry = subjectsList?.subjects.find(
    (item) => item.boardSlug === route.board && item.slug === route.subject && (!query.grade || item.classSlug === query.grade || item.grade === query.grade)
  ) ?? null;

  const grade = query.grade ?? subjectEntry?.classSlug ?? subjectEntry?.grade ?? "9";
  const payload = await getPatternAnalysis({ board: route.board, grade, subject: route.subject }).catch(() => null);

  if (!payload) {
    notFound();
  }

  return (
    <AppShell session={session} currentPath={`/patterns/${payload.board.slug}/${payload.subject.slug}`} contentClassName="max-w-[96rem] px-3 pb-10 pt-3 sm:px-5 lg:px-6">
      <div className="space-y-6">
        <PageHeader
          title=""
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Subjects", href: "/subjects" },
            { label: payload.subject.name, href: `/${payload.board.slug}/${grade}/${payload.subject.slug}` },
            { label: "Exam Patterns" }
          ]}
        />

        <section className="rounded-2xl border border-border-default bg-bg-surface p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Badge>Exam Pattern Analysis</Badge>
                <Badge variant="outline">Last {payload.analysisWindowYears || 5} years</Badge>
              </div>
              <h1 className="text-2xl font-semibold text-text-primary">{payload.subject.name} topic weightage</h1>
              <p className="mt-2 text-sm text-text-secondary">
                Review 5-year topic trends and focus your revision on the most recurring board-exam chapters.
              </p>
            </div>
            <Link href={`/${payload.board.slug}/${grade}/${payload.subject.slug}`} className="rounded-lg border border-border-default px-4 py-2 text-sm font-medium text-text-primary transition hover:border-accent-primary/40">
              Back to subject
            </Link>
          </div>
        </section>

        {payload.recommendation ? (
          <section className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-5 text-sm text-text-primary">
            Focus {payload.recommendation.focusPercent}% of your time on these {payload.recommendation.chapterCount} high-weight chapters: {payload.recommendation.chapters.join(", ")}
          </section>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-2">
          {payload.chapters.map((chapter) => (
            <article key={chapter.id} className="rounded-2xl border border-border-default bg-bg-surface p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-text-primary">
                    Chapter {chapter.chapterNumber}: {chapter.title}
                  </h2>
                  <p className="mt-1 text-xs text-text-secondary">
                    Appeared in {chapter.weightagePercentage}% of recent exams • Avg {Math.round(chapter.avgMarks)} marks
                  </p>
                </div>
                <Badge variant={chapter.weightagePercentage >= 60 ? "warning" : "outline"}>{chapter.weightagePercentage}%</Badge>
              </div>
              <TopicTrendChart points={chapter.trend} />
            </article>
          ))}
        </section>
      </div>
    </AppShell>
  );
}

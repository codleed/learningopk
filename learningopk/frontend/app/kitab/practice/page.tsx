import type { Metadata } from "next";
import { cookies } from "next/headers";

import { Register, StampLink, Tag, TitleBlock } from "@/components/kitab";
import { getDashboardSummary } from "@/lib/progress-api";
import { fetchReviewStats } from "@/lib/srs-api";

export const metadata: Metadata = { title: "Practice — Kitab" };

/* ═══════════════════════════════════════════════════════════════
   PRACTICE — the gym: SRS front and centre, then practice routes.
   SRS stats are fetched client-side; this page shells the data.
   ═══════════════════════════════════════════════════════════════ */

export default async function PracticePage() {
  const cookieHeader = (await cookies()).toString();

  let summary = null;
  try {
    summary = await getDashboardSummary(cookieHeader);
  } catch {
    summary = null;
  }

  const srsSummary = await fetchReviewStats().catch(() => null);

  return (
    <div>
      <TitleBlock
        crumbs={[{ label: "Kitab", href: "/kitab/today" }, { label: "Practice" }]}
        title="The Practice Room"
        lede="Repetition, mock exams, flashcards — every surface of practice in one room."
      />

      <div className="mt-2 flex flex-wrap gap-2">
        <StampLink href="/review" variant="primary" size="md">
          Open review session
        </StampLink>
        <StampLink href="/past-papers" variant="secondary" size="md">
          Past papers
        </StampLink>
        <StampLink href="/formulas" variant="secondary" size="md">
          Formula library
        </StampLink>
      </div>

      <section className="mt-10">
        <div className="overline mb-3 text-ink-soft">Spaced repetition</div>
        {srsSummary ? (
          <div className="flex items-baseline gap-6 text-body text-ink">
            <span>
              <span className="tnum text-2xl">{srsSummary.dueToday}</span>
              <span className="text-caption text-ink-faint"> due today</span>
            </span>
            <span>
              <span className="tnum text-2xl">{srsSummary.dueThisWeek}</span>
              <span className="text-caption text-ink-faint"> this week</span>
            </span>
            <span>
              <span className="tnum text-2xl">{srsSummary.totalReviewed}</span>
              <span className="text-caption text-ink-faint"> reviewed all-time</span>
            </span>
          </div>
        ) : (
          <p className="text-body text-ink-soft">Reviews are resting — nothing scheduled.</p>
        )}
      </section>

      {summary?.quizHistory?.length ? (
        <section className="mt-10">
          <Register
            caption="Recent quizzes"
            entries={summary.quizHistory.slice(0, 8).map((q) => ({
              when: new Date(q.occurredAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              }),
              what: `${q.subjectName} · ${q.chapterTitle}`,
              amount: `${q.percentage}%`,
            }))}
          />
        </section>
      ) : null}

      <div className="mt-10 flex flex-wrap items-center gap-2">
        <Tag tone="brick">Mock exams</Tag>
        <Tag tone="moss">SRS</Tag>
        <Tag tone="neutral">Formulas</Tag>
        <span className="text-caption text-ink-faint">
          Practice is a room you return to, not a streak to protect.
        </span>
      </div>
    </div>
  );
}

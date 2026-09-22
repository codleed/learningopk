import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import {
  Folio,
  FolioBody,
  FolioHeader,
  Register,
  StampLink,
  Tag,
  TitleBlock,
} from "@/components/kitab";
import { getDashboardSummary, type DashboardSummaryResponse } from "@/lib/progress-api";
import { getServerSession } from "@/lib/session";

export const metadata: Metadata = { title: "Today — Kitab" };

/* ═══════════════════════════════════════════════════════════════
   TODAY — the front page of the student's daily paper.
   Columns: Contents (chapters) · Margin (focus, SRS, streak).
   Replaces the dashboard bento with a newspaper front page.
   ═══════════════════════════════════════════════════════════════ */

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default async function TodayPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const cookieHeader = (await cookies()).toString();
  let summary: DashboardSummaryResponse | null = null;
  try {
    summary = await getDashboardSummary(cookieHeader);
  } catch {
    summary = null; /* hub renders its empty state */
  }

  const first = session.user.name.trim().split(/\s+/)[0] ?? "reader";
  const focus = summary?.todaysFocus ?? null;

  return (
    <div>
      <TitleBlock
        crumbs={[{ label: "Kitab", href: "/kitab/today" }, { label: "Today" }]}
        title={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, ${first}.`}
        lede={dateFmt.format(new Date())}
      />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
        {/* ── Contents column ── */}
        <div className="min-w-0 space-y-10">
          <section>
            <div className="overline mb-3 text-ink-soft">Contents</div>
            {summary && summary.subjects.length > 0 ? (
              <ul className="divide-y divide-hairline border-y border-hairline">
                {summary.subjects.map((s) => (
                  <li key={s.subjectId}>
                    <a
                      href={`/subjects/${s.subjectSlug}`}
                      className="group flex items-baseline justify-between gap-4 py-3"
                    >
                      <span className="truncate text-body text-ink group-hover:text-brick-deep">
                        {s.subjectName}
                      </span>
                      <span className="tnum shrink-0 text-data text-ink-soft">
                        {s.chaptersVisitedPercent}%
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <Folio tone="dim">
                <FolioBody>
                  <p className="text-body text-ink-soft">
                    Your shelves are waiting. Pick a board and a class to begin.
                  </p>
                  <StampLink href="/subjects" variant="tertiary" className="mt-3">
                    Open the Library →
                  </StampLink>
                </FolioBody>
              </Folio>
            )}
          </section>
        </div>

        {/* ── Margin column ── */}
        <aside className="min-w-0 space-y-6">
          {focus ? (
            <Folio tone="brick">
              <FolioHeader title="Today's focus" />
              <FolioBody>
                <p className="font-display text-heading text-ink">{focus.title}</p>
                <p className="mt-1.5 text-caption text-ink-soft">{focus.reason}</p>
                <StampLink href={focus.href} variant="primary" size="sm" className="mt-4">
                  {focus.ctaLabel}
                </StampLink>
              </FolioBody>
            </Folio>
          ) : null}

          {summary?.todaysGoal ? (
            <Folio>
              <FolioHeader title="Daily goal" />
              <FolioBody>
                <div className="flex items-baseline gap-2">
                  <span className="tnum text-3xl text-ink">{summary.todaysGoal.percent}%</span>
                  <span className="text-caption text-ink-faint">
                    {summary.todaysGoal.chaptersCompleted}/{summary.todaysGoal.chaptersTarget}{" "}
                    chapters · {summary.todaysGoal.quizzesCompleted}/
                    {summary.todaysGoal.quizzesTarget} quizzes
                  </span>
                </div>
              </FolioBody>
            </Folio>
          ) : null}

          {summary?.xp ? (
            <Folio>
              <FolioHeader title="Progress" />
              <FolioBody>
                <div className="flex items-baseline justify-between">
                  <span className="text-body text-ink">{summary.xp.levelName}</span>
                  <span className="tnum text-data text-ink-soft">{summary.xp.xp} xp</span>
                </div>
                <Tag tone="moss" className="mt-2">
                  Streak {summary.streakDays}d
                </Tag>
              </FolioBody>
            </Folio>
          ) : null}

          {summary?.recentActivity?.length ? (
            <Register
              caption="Recent marks"
              entries={summary.recentActivity.slice(0, 6).map((a) => ({
                when: new Date(a.occurredAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                }),
                what:
                  a.type === "quiz_submit"
                    ? `Quiz · ${a.chapterTitle}`
                    : `Read · ${a.chapterTitle}`,
                amount: a.type === "quiz_submit" ? `${a.percentage}%` : undefined,
                href: a.subjectSlug ? `/subjects/${a.subjectSlug}` : undefined,
              }))}
            />
          ) : null}
        </aside>
      </div>
    </div>
  );
}

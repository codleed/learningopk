import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cn } from "@/lib/utils";

import { Register, StampLink, TitleBlock } from "@/components/kitab";
import { getLeaderboard } from "@/lib/leaderboard-api";
import { getDashboardSummary } from "@/lib/progress-api";
import { getServerSession } from "@/lib/session";

export const metadata: Metadata = { title: "Records — Kitab" };

/* ═══════════════════════════════════════════════════════════════
   RECORDS — the ledger: scores, streaks, ranks, and the print
   shop. Numbers in the margin, right-aligned.
   ═══════════════════════════════════════════════════════════════ */

export default async function RecordsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const cookieHeader = (await cookies()).toString();

  let summary: Awaited<ReturnType<typeof getDashboardSummary>> | null = null;
  try {
    summary = await getDashboardSummary(cookieHeader);
  } catch {
    summary = null;
  }

  let leaderboard: Awaited<ReturnType<typeof getLeaderboard>> | null = null;
  try {
    leaderboard = await getLeaderboard("global", "xp", cookieHeader);
  } catch {
    leaderboard = null;
  }

  return (
    <div>
      <TitleBlock
        crumbs={[{ label: "Kitab", href: "/kitab/today" }, { label: "Records" }]}
        title="Records & Ledgers"
        lede="Everything you've done, set in type: quiz history, streaks, rank, and printable reports."
      />

      <div className="mt-2">
        <StampLink href="/stats" variant="secondary" size="md">
          Open full analytics
        </StampLink>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        {summary?.quizHistory?.length ? (
          <section>
            <Register
              caption="Quiz history"
              entries={summary.quizHistory.slice(0, 10).map((q) => ({
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

        {leaderboard?.entries?.length ? (
          <section>
            <Register
              caption="Class of this month (global, xp)"
              entries={leaderboard.entries.slice(0, 10).map((e) => ({
                when: `#${e.rank}`,
                what: e.isCurrentUser ? `${e.name} (you)` : e.name,
                amount: `${e.xp} xp`,
              }))}
            />
          </section>
        ) : null}
      </div>

      {summary?.dailyActivity?.length ? (
        <section className="mt-10">
          <div className="overline mb-3 text-ink-soft">Attendance — last 12 weeks</div>
          <div className="flex flex-wrap gap-1.5">
            {summary.dailyActivity.slice(-84).map((d) => (
              <span
                key={d.date}
                className={cn(
                  "tnum h-4 w-4 rounded-[2px] border",
                  d.level === 0 && "border-hairline bg-paper",
                  d.level === 1 && "border-transparent bg-moss/30",
                  d.level === 2 && "border-transparent bg-moss/55",
                  d.level === 3 && "border-transparent bg-moss/80",
                  d.level === 4 && "border-transparent bg-moss"
                )}
                title={`${d.date}: ${d.count} activities`}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

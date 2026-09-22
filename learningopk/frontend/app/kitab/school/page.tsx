import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Folio, FolioBody, Register, StampLink, TitleBlock } from "@/components/kitab";
import { getSchoolDashboard, getSchoolStudents } from "@/lib/school-api";
import { getServerSession } from "@/lib/session";

export const metadata: Metadata = { title: "School — Kitab" };

/* ═══════════════════════════════════════════════════════════════
   SCHOOL — the school's own book: enrolment, marks, weak areas.
   Queue (weak areas) + Inspector (top students) + LedgerTable.
   ═══════════════════════════════════════════════════════════════ */

export default async function KitabSchoolPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const cookieHeader = (await cookies()).toString();
  const [dashboard, students] = await Promise.all([
    getSchoolDashboard(cookieHeader).catch(() => null),
    getSchoolStudents(cookieHeader).catch(() => null),
  ]);

  if (!dashboard) {
    return (
      <div>
        <TitleBlock
          crumbs={[{ label: "Kitab", href: "/kitab/today" }, { label: "School" }]}
          title="School Register"
          lede="Your school hasn't opened its book yet."
        />
        <Folio tone="dim" className="mt-10 max-w-xl">
          <FolioBody>
            <p className="text-body text-ink-soft">
              Join a school with an invite code, or ask your teacher to register one.
            </p>
            <StampLink href="/school" variant="primary" size="sm" className="mt-4">
              Join a school
            </StampLink>
          </FolioBody>
        </Folio>
      </div>
    );
  }

  const { school, analytics } = dashboard;

  return (
    <div>
      <TitleBlock
        crumbs={[{ label: "Kitab", href: "/kitab/today" }, { label: "School" }]}
        title={school.name}
        lede={`Board: ${school.board} · Invite code ${school.inviteCode}`}
      />

      <div className="mt-6 flex flex-wrap gap-12 border-y border-hairline py-6">
        <div>
          <div className="tnum text-display-sm text-ink">{analytics.studentCount}</div>
          <div className="overline text-ink-faint">Enrolled</div>
        </div>
        <div>
          <div className="tnum text-display-sm text-ink">{analytics.avgQuizScore}%</div>
          <div className="overline text-ink-faint">Mean quiz score</div>
        </div>
        <div>
          <div className="tnum text-display-sm text-ink">{students?.students.length ?? 0}</div>
          <div className="overline text-ink-faint">On the roll</div>
        </div>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <section>
          <Register
            caption="Inspector — top of the class"
            entries={analytics.topStudents.slice(0, 8).map((s, i) => ({
              when: `#${i + 1}`,
              what: s.class ? `${s.name} (${s.class})` : s.name,
              amount: `${s.xp} xp`,
            }))}
          />
        </section>

        <section>
          <Register
            caption="Queue — weakest chapters"
            entries={analytics.weakAreas.slice(0, 8).map((w) => ({
              when: `${w.avgScore}%`,
              what: w.chapterTitle,
              amount: `${w.studentCount} students`,
            }))}
          />
        </section>
      </div>
    </div>
  );
}

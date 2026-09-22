import type { Metadata } from "next";

import { StampLink, Tag, TitleBlock } from "@/components/kitab";
import { getSubjectsList } from "@/lib/learn-api";

export const metadata: Metadata = { title: "Library — Kitab" };

/* ═══════════════════════════════════════════════════════════════
   LIBRARY — the catalogue. Subjects grouped by board, spine-style
   rows. No cards: the index of a book, not a shop window.
   ═══════════════════════════════════════════════════════════════ */

export default async function LibraryPage() {
  const list = await getSubjectsList().catch(() => null);

  const byBoard = new Map<
    string,
    typeof list extends null ? never[] : NonNullable<typeof list>["subjects"]
  >();
  if (list) {
    for (const s of list.subjects) {
      const arr = byBoard.get(s.boardName) ?? [];
      arr.push(s);
      byBoard.set(s.boardName, arr);
    }
  }

  return (
    <div>
      <TitleBlock
        crumbs={[{ label: "Kitab", href: "/kitab/today" }, { label: "Library" }]}
        title="The Library"
        lede="Every shelf, in order: board → class → subject. Open a subject to see its chapters."
      />

      <div className="mt-2 flex flex-wrap gap-2">
        <StampLink href="/formulas" variant="secondary" size="sm">
          Formulas
        </StampLink>
        <StampLink href="/notes" variant="secondary" size="sm">
          Notes
        </StampLink>
        <StampLink href="/past-papers" variant="secondary" size="sm">
          Past papers
        </StampLink>
      </div>

      {!list ? (
        <p className="mt-10 text-body text-ink-soft">
          The catalogue is unreachable right now. Try again shortly.
        </p>
      ) : (
        [...byBoard.entries()].map(([boardName, subjects]) => (
          <section key={boardName} className="mt-10">
            <div className="overline mb-1 text-ink-soft">{boardName}</div>
            <ul className="divide-y divide-hairline border-y border-hairline">
              {subjects.map((s) => (
                <li key={s.id}>
                  <a
                    href={
                      s.classSlug
                        ? `/subjects/${s.slug}?class=${s.classSlug}`
                        : `/subjects/${s.slug}`
                    }
                    className="group flex items-baseline gap-4 py-3"
                  >
                    <span className="min-w-0 flex-1 truncate text-body text-ink group-hover:text-brick-deep">
                      {s.name}
                    </span>
                    {s.className ? (
                      <span className="overline shrink-0 text-ink-faint">{s.className}</span>
                    ) : null}
                    <span className="tnum shrink-0 text-caption text-ink-faint">{s.boardSlug}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <div className="mt-10 flex items-center gap-3">
        <Tag tone="ochre">FBISE</Tag>
        <Tag tone="ochre">Punjab</Tag>
        <Tag tone="ochre">Sindh</Tag>
        <span className="text-caption text-ink-faint">— three boards, one shelf system.</span>
      </div>
    </div>
  );
}

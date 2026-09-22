import type { Metadata } from "next";

import { StampLink, Tag, TitleBlock } from "@/components/kitab";
import { getForumThreads } from "@/lib/forum-api";

export const metadata: Metadata = { title: "Community — Kitab" };

/* ═══════════════════════════════════════════════════════════════
   COMMUNITY — the letters page. Questions as correspondence:
   threads as text rows, not chat bubbles.
   ═══════════════════════════════════════════════════════════════ */

export default async function CommunityPage() {
  let threads: Awaited<ReturnType<typeof getForumThreads>>["threads"] = [];
  try {
    const feed = await getForumThreads({ solved: "all", limit: 12 });
    threads = feed.threads;
  } catch {
    threads = [];
  }

  return (
    <div>
      <TitleBlock
        crumbs={[{ label: "Kitab", href: "/kitab/today" }, { label: "Community" }]}
        title="The Letters Page"
        lede="Ask, answer, and read what other students worked through."
      />

      <div className="mt-2">
        <StampLink href="/forum" variant="primary" size="md">
          Open the full forum
        </StampLink>
      </div>

      <section className="mt-10">
        <div className="overline mb-3 text-ink-soft">Latest letters</div>
        {threads.length === 0 ? (
          <p className="text-body text-ink-soft">No letters yet — the page is yours to start.</p>
        ) : (
          <ul className="divide-y divide-hairline border-y border-hairline">
            {threads.map((t) => (
              <li key={t.id}>
                <a href={`/forum/${t.id}`} className="group block py-3">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="min-w-0 flex-1 truncate text-body text-ink group-hover:text-brick-deep">
                      {t.title}
                    </span>
                    <span className="tnum shrink-0 text-caption text-ink-faint">
                      {t.replyCount} replies
                    </span>
                  </div>
                  <div className="mt-0.5 text-caption text-ink-faint">
                    {t.userName} ·{" "}
                    {new Date(t.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-10 flex items-center gap-2">
        <Tag tone="moss">Answered</Tag>
        <span className="text-caption text-ink-faint">
          Green seal means an accepted answer is inside.
        </span>
      </div>
    </div>
  );
}

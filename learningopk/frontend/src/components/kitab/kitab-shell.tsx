import Link from "next/link";
import type { ReactNode } from "react";
import type { SessionPayload } from "@/lib/session";
import { isStaffSession } from "@/components/admin/admin-guard";
import type { IndexEntry } from "./kitab-index";
import { KitabIndexClientBridge } from "./kitab-index-bridge";
import { PullOut } from "./pull-out";
import type { QuietBarLink } from "./quiet-bar";

/* ═══════════════════════════════════════════════════════════════
   KitabShell — the chrome-less replacement for AppShell.
   Desktop: 40px QuietBar only. Mobile: no bar at all.
   The Index (⌘K) is the primary navigation on both.
   ═══════════════════════════════════════════════════════════════ */

const HUB_LINKS: QuietBarLink[] = [
  { href: "/kitab/today", label: "Today", currentMatch: "/kitab/today" },
  { href: "/kitab/library", label: "Library", currentMatch: "/kitab/library" },
  { href: "/kitab/practice", label: "Practice", currentMatch: "/kitab/practice" },
  { href: "/kitab/community", label: "Community", currentMatch: "/kitab/community" },
  { href: "/kitab/records", label: "Records", currentMatch: "/kitab/records" },
];

export function KitabShell({
  session,
  children,
}: {
  session: SessionPayload | null;
  children: ReactNode;
}) {
  const staff = session ? isStaffSession(session) : false;

  const indexEntries: IndexEntry[] = [
    ...HUB_LINKS.map((l) => ({ label: l.label, href: l.href, kind: "hub" as const })),
    { label: "Dashboard", href: "/dashboard", kind: "page" },
    { label: "Forum", href: "/forum", kind: "page" },
    { label: "AI Tutor", href: "/ai-tutor", kind: "page" },
    ...(staff
      ? ([
          { label: "Admin console", href: "/admin", kind: "admin" },
          { label: "School ERP", href: "/school/erp", kind: "admin" },
        ] satisfies IndexEntry[])
      : []),
  ];

  return (
    <div className="min-h-screen bg-paper">
      {/* Client island: sticky QuietBar + ⌘K Index overlay. */}
      <KitabIndexClientBridge entries={indexEntries} links={HUB_LINKS} />

      {/* Mobile: bookmark-tab pull-out with the same entries, no bar. */}
      <PullOut label="Open index">
        <div className="overline mb-4 text-ink-faint">Kitab — Index</div>
        <ul className="text-body">
          {indexEntries.map((e) => (
            <li key={e.href + e.label} className="border-b border-hairline py-2">
              <Link href={e.href} className="text-ink hover:text-accent">
                {e.label}
              </Link>
            </li>
          ))}
        </ul>
      </PullOut>

      <main id="kitab-main" className="mx-auto w-full max-w-page px-6 pb-24 pt-8">
        {children}
      </main>

      <footer className="border-t border-hairline">
        <div className="mx-auto flex max-w-page items-center justify-between px-6 py-6 text-caption text-ink-faint">
          <span className="font-display text-sm font-semibold text-ink">Kitab</span>
          <span>An open workbook for Pakistani students.</span>
        </div>
      </footer>

      {/* Index overlay is rendered by the client island above. */}
    </div>
  );
}

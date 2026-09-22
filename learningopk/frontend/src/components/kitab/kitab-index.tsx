"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/* ═══════════════════════════════════════════════════════════════
   Index — full-screen alphabetical page of everything, invoked
   like an open command (⌘K). Search box + A–Z. Replaces all
   persistent nav (sidebar/tabs).
   ═══════════════════════════════════════════════════════════════ */

export type IndexEntry = {
  label: string;
  href: string;
  kind: "hub" | "page" | "admin" | "action";
};

const KIND_SECTION: Record<IndexEntry["kind"], string> = {
  hub: "Hubs",
  page: "Pages",
  admin: "Staff",
  action: "Actions",
};

export function KitabIndex({
  open,
  onClose,
  entries,
}: {
  open: boolean;
  onClose: () => void;
  entries: IndexEntry[];
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? entries.filter((e) => e.label.toLowerCase().includes(q)) : entries;
    const groups = new Map<IndexEntry["kind"], IndexEntry[]>();
    for (const e of filtered) {
      const list = groups.get(e.kind) ?? [];
      list.push(e);
      groups.set(e.kind, list);
    }
    for (const list of groups.values()) {
      list.sort((a, b) => a.label.localeCompare(b.label));
    }
    return [...groups.entries()];
  }, [query, entries]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Index">
      <button
        type="button"
        aria-label="Close index"
        onClick={onClose}
        className="absolute inset-0 bg-black/55"
      />
      <div className="absolute inset-x-0 top-[6vh] mx-auto flex h-[80vh] w-[min(92vw,640px)] flex-col rounded-folio border border-hairline-strong bg-paper-dim shadow-[var(--shadow-md)]">
        <div className="border-b border-hairline p-4">
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "Enter") {
                const first = results[0]?.[1][0];
                if (first) {
                  onClose();
                  if (first.kind === "action") return; /* actions handled by callers */
                  router.push(first.href);
                }
              }
            }}
            placeholder="Type to search the index…"
            className="h-9 w-full bg-transparent text-body text-ink outline-none placeholder:text-ink-faint"
            aria-label="Search the index"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {results.length === 0 ? (
            <p className="text-body text-ink-faint">No entries match “{query}”.</p>
          ) : (
            results.map(([kind, list]) => (
              <section key={kind} className="mb-6">
                <div className="overline mb-2 text-ink-faint">{KIND_SECTION[kind]}</div>
                <ul>
                  {list.map((e) => (
                    <li key={e.href + e.label}>
                      <Link
                        href={e.href}
                        onClick={onClose}
                        className="flex items-baseline gap-3 rounded-tag py-1.5 text-body text-ink hover:bg-accent-tint"
                      >
                        <span className="flex-1 truncate">{e.label}</span>
                        <span className="overline text-ink-faint">{e.kind}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>

        <div className="border-t border-hairline p-3 text-caption text-ink-faint">
          <span className="tnum">ESC</span> close · <span className="tnum">Enter</span> open first
          result
        </div>
      </div>
    </div>
  );
}

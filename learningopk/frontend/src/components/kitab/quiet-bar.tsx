"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════
   QuietBar — 44px desktop strip. The ONLY persistent chrome.
   Contains: hub links (text), ⌘K Index trigger, theme toggle.
   Renders nothing on mobile (pull-out + Index handle it).
   ═══════════════════════════════════════════════════════════════ */

export type QuietBarLink = {
  href: string;
  label: string;
  currentMatch?: string;
};

export function QuietBar({
  links,
  onOpenIndex,
  renderThemeToggle,
  className,
}: {
  links: QuietBarLink[];
  onOpenIndex: () => void;
  renderThemeToggle?: () => React.ReactNode;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <div
      className={cn(
        "quietbar-glass sticky top-0 z-40 hidden h-11 items-center gap-5 px-4 lg:flex",
        className
      )}
      data-testid="kitab-quietbar"
    >
      <span aria-hidden="true" className="text-base font-bold text-ink">
        Kitab
      </span>
      <nav aria-label="Hubs" className="flex items-center gap-1">
        {links.map((l) => {
          const active = l.currentMatch ? pathname.startsWith(l.currentMatch) : pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "px-2 py-1 text-xs font-semibold",
                active ? "text-accent-bright" : "text-ink-soft hover:text-ink"
              )}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex-1" />
      <button
        type="button"
        onClick={onOpenIndex}
        className="flex items-center gap-2 rounded-[6px] border border-hairline-strong px-2 py-1 text-caption text-ink-soft hover:border-accent hover:text-accent-bright"
      >
        <span>Index</span>
        <span className="tnum rounded-tag border border-hairline px-1 text-[0.625rem]">⌘K</span>
      </button>
      {renderThemeToggle?.()}
    </div>
  );
}
